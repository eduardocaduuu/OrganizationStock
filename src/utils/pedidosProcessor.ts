import * as XLSX from 'xlsx';
import { PedidoItem, PedidosMetrics, DistribuicaoAtraso, PedidosResult } from '../types/pedidos';
import { getProximoDiaUtil, calcularDiasUteis, isDiaUtil } from './feriadosNacionais';

/**
 * Parser robusto para números no formato brasileiro
 */
const parseNumberBR = (value: unknown): number => {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  let str = String(value).trim();
  if (str === '' || str === '-') return 0;

  // Remove R$ e espaços
  str = str.replace(/R\$\s*/gi, '');

  // Se tem vírgula, assume formato BR (1.234,56)
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Parser para data no formato brasileiro
 * Aceita: "10/12/2025 11:43:46" ou "05/01/2026"
 * Retorna apenas a data (sem hora)
 */
const parseDateBR = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;

  // Se já é uma data do Excel (número)
  if (typeof value === 'number') {
    // Excel date serial number
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    // Zera hora
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Extrai apenas a parte da data (antes do espaço se houver hora)
  const datePart = str.split(' ')[0];

  // Formato: DD/MM/YYYY
  const parts = datePart.split('/');
  if (parts.length !== 3) return null;

  const dia = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
  const ano = parseInt(parts[2], 10);

  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;

  const date = new Date(ano, mes, dia);
  date.setHours(0, 0, 0, 0);

  return date;
};

/**
 * Processa arquivo Excel de pedidos
 */
export const processPedidosFile = async (file: File): Promise<PedidosResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const rows = jsonData as unknown[][];
        if (rows.length < 2) {
          resolve({
            items: [],
            metrics: getEmptyMetrics(),
            distribuicaoAtraso: []
          });
          return;
        }

        const headers = rows[0].map((h: unknown) => String(h || ''));
        const result = parsePedidosData(rows, headers);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};

const getEmptyMetrics = (): PedidosMetrics => ({
  totalPedidos: 0,
  valorTotal: 0,
  pedidosNoPrazo: 0,
  pedidosAtrasados: 0,
  percentualNoPrazo: 0,
  percentualAtrasados: 0,
  tempoMedioDiasUteis: 0,
  valorNoPrazo: 0,
  valorAtrasados: 0,
});

/**
 * Encontra índice de coluna de forma flexível
 */
const findColumnIndex = (headers: string[], ...possibleNames: string[]): number => {
  const normalizedHeaders = headers.map(h =>
    h?.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
  );

  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

    const index = normalizedHeaders.findIndex(h =>
      h === normalizedName || h.includes(normalizedName)
    );

    if (index !== -1) return index;
  }

  return -1;
};

/**
 * Parser dos dados de pedidos
 */
const parsePedidosData = (data: unknown[][], headers: string[]): PedidosResult => {
  // Encontrar índices das colunas
  const codigoIndex = findColumnIndex(headers, 'codigopedido', 'codigo pedido', 'codigo', 'pedido');
  const valorIndex = findColumnIndex(headers, 'valorpraticado', 'valor praticado', 'valor');
  const dataAprovacaoIndex = findColumnIndex(headers, 'data aprovacao', 'dataaprovacao', 'aprovacao', 'data aprovação');
  const dataFaturamentoIndex = findColumnIndex(headers, 'datafaturamento', 'data faturamento', 'faturamento');

  // Validações
  if (codigoIndex === -1) {
    throw new Error('Coluna "CodigoPedido" não encontrada na planilha');
  }
  if (valorIndex === -1) {
    throw new Error('Coluna "ValorPraticado" não encontrada na planilha');
  }
  if (dataAprovacaoIndex === -1) {
    throw new Error('Coluna "Data Aprovação" não encontrada na planilha');
  }
  if (dataFaturamentoIndex === -1) {
    throw new Error('Coluna "DataFaturamento" não encontrada na planilha');
  }

  const items: PedidoItem[] = [];
  let valorTotal = 0;
  let valorNoPrazo = 0;
  let valorAtrasados = 0;
  let somaDiasUteis = 0;
  let pedidosNoPrazo = 0;
  let pedidosAtrasados = 0;

  // Contadores para distribuição de atraso
  const distribuicaoContador: Record<string, number> = {
    '1 dia': 0,
    '2 dias': 0,
    '3 dias': 0,
    '4 dias': 0,
    '5+ dias': 0,
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const codigoPedido = String(row[codigoIndex] || '').trim();
    if (!codigoPedido) continue;

    const valorPraticado = parseNumberBR(row[valorIndex]);
    const dataAprovacaoOriginal = parseDateBR(row[dataAprovacaoIndex]);
    const dataFaturamento = parseDateBR(row[dataFaturamentoIndex]);

    if (!dataAprovacaoOriginal || !dataFaturamento) continue;

    // Ajustar data de aprovação para próximo dia útil se necessário
    const dataAprovacaoAjustada = isDiaUtil(dataAprovacaoOriginal)
      ? new Date(dataAprovacaoOriginal)
      : getProximoDiaUtil(dataAprovacaoOriginal);

    // Calcular dias úteis entre aprovação (ajustada) e faturamento
    const diasUteis = calcularDiasUteis(dataAprovacaoAjustada, dataFaturamento);

    // Verificar se está dentro do prazo (1 dia útil = 24h)
    const dentroDosPrazo = diasUteis <= 1;
    const status = dentroDosPrazo ? 'no-prazo' : 'atrasado';

    items.push({
      id: `pedido-${i}-${Date.now()}`,
      codigoPedido,
      valorPraticado,
      dataAprovacao: dataAprovacaoAjustada,
      dataAprovacaoOriginal,
      dataFaturamento,
      diasUteis,
      dentroDosPrazo,
      status,
    });

    // Acumular métricas
    valorTotal += valorPraticado;
    somaDiasUteis += diasUteis;

    if (dentroDosPrazo) {
      pedidosNoPrazo++;
      valorNoPrazo += valorPraticado;
    } else {
      pedidosAtrasados++;
      valorAtrasados += valorPraticado;

      // Distribuição de atraso (dias além do prazo de 1 dia)
      const diasAtraso = diasUteis - 1;
      if (diasAtraso === 1) distribuicaoContador['1 dia']++;
      else if (diasAtraso === 2) distribuicaoContador['2 dias']++;
      else if (diasAtraso === 3) distribuicaoContador['3 dias']++;
      else if (diasAtraso === 4) distribuicaoContador['4 dias']++;
      else distribuicaoContador['5+ dias']++;
    }
  }

  const totalPedidos = items.length;
  const percentualNoPrazo = totalPedidos > 0 ? Math.round((pedidosNoPrazo / totalPedidos) * 100) : 0;
  const percentualAtrasados = totalPedidos > 0 ? Math.round((pedidosAtrasados / totalPedidos) * 100) : 0;
  const tempoMedioDiasUteis = totalPedidos > 0 ? Math.round((somaDiasUteis / totalPedidos) * 10) / 10 : 0;

  // Montar distribuição de atraso
  const distribuicaoAtraso: DistribuicaoAtraso[] = [];
  if (pedidosAtrasados > 0) {
    Object.entries(distribuicaoContador).forEach(([diasAtraso, quantidade]) => {
      if (quantidade > 0) {
        distribuicaoAtraso.push({
          diasAtraso,
          quantidade,
          percentual: Math.round((quantidade / pedidosAtrasados) * 100),
        });
      }
    });
  }

  const metrics: PedidosMetrics = {
    totalPedidos,
    valorTotal,
    pedidosNoPrazo,
    pedidosAtrasados,
    percentualNoPrazo,
    percentualAtrasados,
    tempoMedioDiasUteis,
    valorNoPrazo,
    valorAtrasados,
  };

  return { items, metrics, distribuicaoAtraso };
};

/**
 * Formata valor monetário no padrão brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata data no padrão brasileiro
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

/**
 * Exporta pedidos para Excel
 */
export const exportPedidosToExcel = (
  items: PedidoItem[],
  filename: string = 'relatorio-pedidos.xlsx'
) => {
  const exportData = items.map(item => ({
    'Código Pedido': item.codigoPedido,
    'Valor Praticado': item.valorPraticado,
    'Data Aprovação (Original)': formatDate(item.dataAprovacaoOriginal),
    'Data Aprovação (Ajustada)': formatDate(item.dataAprovacao),
    'Data Faturamento': formatDate(item.dataFaturamento),
    'Dias Úteis': item.diasUteis,
    'Status': item.status === 'no-prazo' ? 'No Prazo' : 'Atrasado',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

  // Auto-ajustar largura das colunas
  const maxWidth = 50;
  const colWidths = Object.keys(exportData[0] || {}).map(key => {
    const maxLength = Math.max(
      key.length,
      ...exportData.map(row => String(row[key as keyof typeof row]).length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, filename);
};
