import * as XLSX from 'xlsx';
import {
  RotaItem,
  RotaStatus,
  RotaUnidade,
  RotasMetrics,
  RotasResult,
  RotasUnidadeMetrics,
  MotoristaStats,
} from '../types/rotas';

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Classifica o status do pedido.
 * Retorna null para pedidos que devem ser ignorados na análise.
 */
const classifyStatus = (status: string): RotaStatus | null => {
  const s = normalize(status);

  // Ignorados — excluídos da análise
  if (s.includes('aguardando geracao')) return null;
  if (s === 'em transito' || s.startsWith('em transito')) return null;

  // Sucesso do motorista
  if (s === 'entregue') return 'entregue';
  if (s === 'no cliente') return 'entregue';

  // Cliente retirou no espaço do revendedor
  if (s === 'retirado') return 'retirado';

  // Todos os demais = dificuldade (Carga recusada, Destinatário ausente,
  // Destinatário desconhecido, Devolvido, Difícil acesso, Endereço não
  // localizado, Extravio confirmado, Não visitado, etc.)
  return 'dificuldade';
};

const getUnidade = (expedidor: string): RotaUnidade => {
  const s = expedidor.trim().replace(/[.\s]/g, '');
  if (s.startsWith('13706')) return 'palmeira';
  if (s.startsWith('13707')) return 'penedo';
  return 'desconhecida';
};

const parseNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  let str = String(value).trim().replace(/R\$\s*/gi, '');
  if (!str || str === '-') return 0;
  // Formato 1.234,56 → 1234.56
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

const findColumnIndex = (headers: string[], ...names: string[]): number => {
  const nh = headers.map(h => normalize(String(h || '')));
  for (const name of names) {
    const nn = normalize(name);
    const idx = nh.findIndex(h => h === nn || h.includes(nn));
    if (idx !== -1) return idx;
  }
  return -1;
};

const emptyUnidade = (nome: string): RotasUnidadeMetrics => ({
  nome,
  totalPedidos: 0,
  totalEntregues: 0,
  totalDificuldades: 0,
  totalRetirados: 0,
  valorTotal: 0,
  freteTotal: 0,
  distanciaMedia: 0,
  distanciaTotal: 0,
});

const calcularMetrics = (items: RotaItem[]): RotasMetrics => {
  let totalEntregues = 0,
    totalDificuldades = 0,
    totalRetirados = 0;
  let totalOcorrencias = 0,
    valorTotal = 0,
    freteTotal = 0;
  let distanciaTotal = 0,
    totalItens = 0;
  const tiposDifMap = new Map<string, number>();
  const tiposOcorrMap = new Map<string, number>();
  let pedidosComOcorrencia = 0;

  const palmItems = items.filter(i => i.unidade === 'palmeira');
  const penItems = items.filter(i => i.unidade === 'penedo');

  items.forEach(item => {
    if (item.status === 'entregue') totalEntregues++;
    else if (item.status === 'dificuldade') {
      totalDificuldades++;
      const tipo = item.statusOriginal || 'Desconhecido';
      tiposDifMap.set(tipo, (tiposDifMap.get(tipo) || 0) + 1);
    } else if (item.status === 'retirado') totalRetirados++;

    totalOcorrencias += item.quantidadeOcorrencias;

    if (item.temOcorrencias && item.ultimaOcorrenciaStatus) {
      pedidosComOcorrencia++;
      const tipo = item.ultimaOcorrenciaStatus;
      tiposOcorrMap.set(tipo, (tiposOcorrMap.get(tipo) || 0) + 1);
    }

    valorTotal += item.valorTotal;
    freteTotal += item.precoFrete;
    distanciaTotal += item.distanciaMetros;
    totalItens += item.itens;
  });

  const total = items.length;

  const calcUnidade = (unitItems: RotaItem[], nome: string): RotasUnidadeMetrics => {
    const m = emptyUnidade(nome);
    m.totalPedidos = unitItems.length;
    let dist = 0;
    unitItems.forEach(i => {
      if (i.status === 'entregue') m.totalEntregues++;
      else if (i.status === 'dificuldade') m.totalDificuldades++;
      else if (i.status === 'retirado') m.totalRetirados++;
      m.valorTotal += i.valorTotal;
      m.freteTotal += i.precoFrete;
      dist += i.distanciaMetros;
    });
    m.distanciaTotal = dist;
    m.distanciaMedia = unitItems.length > 0 ? dist / unitItems.length : 0;
    return m;
  };

  const tiposDificuldade = Array.from(tiposDifMap.entries())
    .map(([tipo, quantidade]) => ({ tipo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const tiposOcorrencia = Array.from(tiposOcorrMap.entries())
    .map(([tipo, quantidade]) => ({ tipo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return {
    totalPedidos: total,
    totalEntregues,
    totalDificuldades,
    totalRetirados,
    percentualEntregues: total > 0 ? Math.round((totalEntregues / total) * 100) : 0,
    percentualDificuldades: total > 0 ? Math.round((totalDificuldades / total) * 100) : 0,
    totalOcorrencias,
    pedidosComOcorrencia,
    valorTotal,
    freteTotal,
    freteMedia: total > 0 ? freteTotal / total : 0,
    distanciaTotal,
    distanciaMedia: total > 0 ? distanciaTotal / total : 0,
    totalItens,
    tiposDificuldade,
    tiposOcorrencia,
    palmeira: calcUnidade(palmItems, 'Palmeira dos Índios'),
    penedo: calcUnidade(penItems, 'Penedo'),
  };
};

const calcularMotoristasStats = (items: RotaItem[]): MotoristaStats[] => {
  const map = new Map<string, MotoristaStats>();

  items.forEach(item => {
    const key = item.motorista || '(Sem motorista)';
    if (!map.has(key)) {
      map.set(key, {
        nome: key,
        totalPedidos: 0,
        entregues: 0,
        dificuldades: 0,
        retirados: 0,
        taxaSucesso: 0,
        taxaDificuldade: 0,
        distanciaTotal: 0,
        distanciaMedia: 0,
        totalOcorrencias: 0,
        freteTotal: 0,
        valorTotal: 0,
        unidades: [],
      });
    }
    const s = map.get(key)!;
    s.totalPedidos++;
    if (item.status === 'entregue') s.entregues++;
    else if (item.status === 'dificuldade') s.dificuldades++;
    else if (item.status === 'retirado') s.retirados++;
    s.totalOcorrencias += item.quantidadeOcorrencias;
    s.distanciaTotal += item.distanciaMetros;
    s.freteTotal += item.precoFrete;
    s.valorTotal += item.valorTotal;
    const exp = item.expedidor.trim();
    if (exp && !s.unidades.includes(exp)) s.unidades.push(exp);
  });

  return Array.from(map.values())
    .map(s => ({
      ...s,
      taxaSucesso:
        s.totalPedidos > 0 ? Math.round((s.entregues / s.totalPedidos) * 100) : 0,
      taxaDificuldade:
        s.totalPedidos > 0 ? Math.round((s.dificuldades / s.totalPedidos) * 100) : 0,
      distanciaMedia: s.totalPedidos > 0 ? s.distanciaTotal / s.totalPedidos : 0,
    }))
    .sort((a, b) => b.totalPedidos - a.totalPedidos);
};

export const processRotasFile = async (file: File): Promise<RotasResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    reader.onload = e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: isCSV ? 'string' : 'binary',
          raw: false,
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: '',
        }) as unknown[][];

        if (rows.length < 2) {
          resolve({ items: [], metrics: calcularMetrics([]), motoristas: [] });
          return;
        }

        const headers = rows[0].map(h => String(h || ''));

        const idx = {
          pedido: findColumnIndex(headers, 'pedido'),
          nome: findColumnIndex(headers, 'nome'),
          municipio: findColumnIndex(headers, 'municipio', 'município'),
          uf: findColumnIndex(headers, 'uf'),
          bairro: findColumnIndex(headers, 'bairro'),
          itens: findColumnIndex(headers, 'itens'),
          valorTotal: findColumnIndex(headers, 'valor total'),
          status: findColumnIndex(headers, 'status'),
          motorista: findColumnIndex(headers, 'motorista'),
          expedidor: findColumnIndex(headers, 'expedidor'),
          ocorrencias: findColumnIndex(
            headers,
            'existem ocorrencias',
            'existem ocorrências'
          ),
          ultimaStatus: findColumnIndex(
            headers,
            'ultima ocorrencia (status)',
            'última ocorrência (status)'
          ),
          ultimaMsg: findColumnIndex(
            headers,
            'ultima ocorrencia (mensagem)',
            'última ocorrência (mensagem)'
          ),
          qtdOcorrencias: findColumnIndex(
            headers,
            'quantidade de ocorrencias',
            'quantidade de ocorrências'
          ),
          distancia: findColumnIndex(
            headers,
            'distancia em metros',
            'distância em metros'
          ),
          precoFrete: findColumnIndex(headers, 'preco do frete', 'preço do frete'),
          valorFrete: findColumnIndex(headers, 'valor do frete'),
        };

        if (idx.status === -1) {
          throw new Error('Coluna "Status" não encontrada na planilha');
        }
        if (idx.motorista === -1) {
          throw new Error('Coluna "Motorista" não encontrada na planilha');
        }

        const items: RotaItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row || row.length === 0) continue;

          const statusOriginal = String(row[idx.status] ?? '').trim();
          if (!statusOriginal) continue;

          const status = classifyStatus(statusOriginal);
          if (status === null) continue; // ignorado da análise

          const expedidor =
            idx.expedidor !== -1 ? String(row[idx.expedidor] ?? '').trim() : '';

          // Preço do frete: usa "Preço do frete", cai para "Valor do frete" se vazio
          let precoFrete =
            idx.precoFrete !== -1 ? parseNumber(row[idx.precoFrete]) : 0;
          if (precoFrete === 0 && idx.valorFrete !== -1) {
            precoFrete = parseNumber(row[idx.valorFrete]);
          }

          items.push({
            id: `rota-${i}`,
            pedido: idx.pedido !== -1 ? String(row[idx.pedido] ?? '').trim() : '',
            nome: idx.nome !== -1 ? String(row[idx.nome] ?? '').trim() : '',
            municipio:
              idx.municipio !== -1 ? String(row[idx.municipio] ?? '').trim() : '',
            uf: idx.uf !== -1 ? String(row[idx.uf] ?? '').trim() : '',
            bairro: idx.bairro !== -1 ? String(row[idx.bairro] ?? '').trim() : '',
            itens: idx.itens !== -1 ? parseNumber(row[idx.itens]) : 0,
            valorTotal:
              idx.valorTotal !== -1 ? parseNumber(row[idx.valorTotal]) : 0,
            status,
            statusOriginal,
            motorista:
              idx.motorista !== -1
                ? String(row[idx.motorista] ?? '').trim()
                : '',
            expedidor,
            unidade: getUnidade(expedidor),
            temOcorrencias:
              idx.ocorrencias !== -1
                ? normalize(String(row[idx.ocorrencias] ?? '')) === 'sim'
                : false,
            ultimaOcorrenciaStatus:
              idx.ultimaStatus !== -1
                ? String(row[idx.ultimaStatus] ?? '').trim()
                : '',
            ultimaOcorrenciaMensagem:
              idx.ultimaMsg !== -1
                ? String(row[idx.ultimaMsg] ?? '').trim()
                : '',
            quantidadeOcorrencias:
              idx.qtdOcorrencias !== -1
                ? parseNumber(row[idx.qtdOcorrencias])
                : 0,
            distanciaMetros:
              idx.distancia !== -1 ? parseNumber(row[idx.distancia]) : 0,
            precoFrete,
          });
        }

        resolve({
          items,
          metrics: calcularMetrics(items),
          motoristas: calcularMotoristasStats(items),
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(reader.error);

    if (isCSV) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsBinaryString(file);
    }
  });
};

export const formatDistance = (meters: number): string => {
  if (meters === 0) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

export const formatCurrencyBR = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
