import * as XLSX from 'xlsx';
import { StockItem, ProcessedItem, ItemStatus, VariantGroup, ExcelTemplate, SetorItem, SetorMetrics } from '../types';

/**
 * Detecta o template da planilha baseado nos headers
 */
const detectTemplate = (headers: string[]): 'legacy' | 'disponivel' => {
  const normalizedHeaders = headers.map(h =>
    h?.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ')
  );

  // Verifica se contém "total - disponivel" (com ou sem acento, já normalizado)
  const hasDisponivel = normalizedHeaders.some(h =>
    h.includes('total - disponivel') || h === 'total - disponivel'
  );

  return hasDisponivel ? 'disponivel' : 'legacy';
};

/**
 * Parser robusto para números no formato brasileiro
 * Aceita: string com vírgula decimal, pontos de milhar, valores negativos, espaços
 */
const parseNumberBR = (value: unknown): number => {
  if (value === null || value === undefined) return 0;

  // Se já é número, retorna direto
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Converte para string e limpa espaços
  let str = String(value).trim();

  if (str === '' || str === '-') return 0;

  // Detecta se é negativo (pode ter parênteses ou sinal)
  const isNegative = str.startsWith('-') || str.startsWith('(') || str.endsWith('-');

  // Remove caracteres não numéricos exceto vírgula e ponto
  str = str.replace(/[^\d.,\-]/g, '');

  // Se tem vírgula, assume formato BR (1.234,56)
  if (str.includes(',')) {
    // Remove pontos de milhar e troca vírgula por ponto
    str = str.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(str);

  if (isNaN(num)) return 0;

  return isNegative && num > 0 ? -num : num;
};

export const processExcelFile = async (
  file: File,
  template: ExcelTemplate = 'auto'
): Promise<{ items: ProcessedItem[]; detectedTemplate: 'legacy' | 'disponivel' }> => {
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
          resolve({ items: [], detectedTemplate: 'legacy' });
          return;
        }

        const headers = rows[0].map((h: unknown) => String(h || ''));

        // Detecta ou usa o template especificado (setores é tratado separadamente)
        const effectiveTemplate: 'legacy' | 'disponivel' =
          template === 'auto' ? detectTemplate(headers) :
          (template === 'setores' ? 'legacy' : template);

        const items = effectiveTemplate === 'disponivel'
          ? parseDisponivelData(rows)
          : parseLegacyData(rows);

        const processedItems = analyzeItems(items);
        resolve({ items: processedItems, detectedTemplate: effectiveTemplate });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};

/**
 * Parser para formato "disponivel"
 * Colunas: Codigo Material, Nome Material, Total - Disponível
 */
const parseDisponivelData = (data: unknown[][]): StockItem[] => {
  if (data.length < 2) return [];

  const headers = data[0].map((h: unknown) =>
    String(h || '').toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
  );

  // Mapear colunas do formato disponivel
  const codMaterialIndex = headers.findIndex(h =>
    h === 'codigo material' || h.includes('codigo material')
  );

  const nomeMaterialIndex = headers.findIndex(h =>
    h === 'nome material' || h.includes('nome material')
  );

  const totalDisponivelIndex = headers.findIndex(h =>
    h === 'total - disponivel' || h.includes('total - disponivel')
  );

  if (codMaterialIndex === -1 || nomeMaterialIndex === -1 || totalDisponivelIndex === -1) {
    console.log('Headers encontrados (disponivel):', headers);
    throw new Error('Colunas obrigatórias não encontradas: "Codigo Material", "Nome Material", "Total - Disponível"');
  }

  const items: StockItem[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const codMaterial = String(row[codMaterialIndex] || '').trim();
    const descMaterial = String(row[nomeMaterialIndex] || '').trim();
    const quantidade = parseNumberBR(row[totalDisponivelIndex]);

    if (codMaterial && descMaterial) {
      items.push({
        codMaterial,
        descMaterial,
        quantidade,
        estacao: '',
        rack: '',
        linhaProdAlocado: '',
        colunaProdAlocado: ''
      });
    }
  }

  return items;
};

/**
 * Parser para formato "legacy" (original)
 * Colunas: Cod Material, Desc Material, Total físico, Estação, Rack, etc.
 */
const parseLegacyData = (data: unknown[][]): StockItem[] => {
  if (data.length < 2) return [];

  const headers = data[0].map((h: unknown) =>
    String(h || '').toLowerCase().trim().replace(/\s+/g, ' ')
  );

  // Procurar por "Cod Material" (com espaço)
  const codMaterialIndex = headers.findIndex((h: string) =>
    h === 'cod material' || h.includes('cod material')
  );

  // Procurar por "Desc Material" (com espaço)
  const descMaterialIndex = headers.findIndex((h: string) =>
    h === 'desc material' || h.includes('desc material')
  );

  // Procurar por "total físico" (com acento)
  const quantidadeIndex = headers.findIndex((h: string) =>
    h.includes('total físico') || h.includes('total fisico') || h === 'total físico' || h.includes('quantidade')
  );

  // Procurar colunas adicionais
  const estacaoIndex = headers.findIndex((h: string) =>
    h === 'estacao' || h.includes('estacao') || h === 'estação'
  );

  const rackIndex = headers.findIndex((h: string) =>
    h === 'rack' || h.includes('rack')
  );

  const linhaProdAlocadoIndex = headers.findIndex((h: string) =>
    h === 'linha prod alocado' || h.includes('linha prod alocado') || h === 'linha prod' || h.includes('linha prod')
  );

  const colunaProdAlocadoIndex = headers.findIndex((h: string) =>
    h === 'coluna prod alocado' || h.includes('coluna prod alocado') || h === 'coluna prod' || h.includes('coluna prod')
  );

  if (codMaterialIndex === -1 || descMaterialIndex === -1 || quantidadeIndex === -1) {
    console.log('Headers encontrados:', headers);
    throw new Error('Colunas obrigatórias não encontradas: "Cod Material", "Desc Material", "Total físico"');
  }

  const items: StockItem[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const codMaterial = String(row[codMaterialIndex] || '').trim();
    const descMaterial = String(row[descMaterialIndex] || '').trim();
    const quantidade = parseNumberBR(row[quantidadeIndex]);

    if (codMaterial && descMaterial) {
      items.push({
        codMaterial,
        descMaterial,
        quantidade,
        estacao: estacaoIndex !== -1 ? (String(row[estacaoIndex] || '').trim() || '-') : '-',
        rack: rackIndex !== -1 ? (String(row[rackIndex] || '').trim() || '-') : '-',
        linhaProdAlocado: linhaProdAlocadoIndex !== -1 ? (String(row[linhaProdAlocadoIndex] || '').trim() || '-') : '-',
        colunaProdAlocado: colunaProdAlocadoIndex !== -1 ? (String(row[colunaProdAlocadoIndex] || '').trim() || '-') : '-'
      });
    }
  }

  return items;
};

const extractVariantPattern = (description: string): { base: string; variant: string | null } => {
  // Regex para detectar V + número no final da descrição
  const variantRegex = /\s+V\d+$/i;
  const match = description.match(variantRegex);

  if (match) {
    return {
      base: description.replace(variantRegex, '').trim(),
      variant: match[0].trim()
    };
  }

  return { base: description, variant: null };
};

const analyzeItems = (items: StockItem[]): ProcessedItem[] => {
  // Agrupar por código exato
  const codeGroups = new Map<string, StockItem[]>();
  items.forEach(item => {
    const existing = codeGroups.get(item.codMaterial) || [];
    existing.push(item);
    codeGroups.set(item.codMaterial, existing);
  });

  // Agrupar por descrição base (removendo variantes)
  const descriptionGroups = new Map<string, StockItem[]>();
  items.forEach(item => {
    const { base } = extractVariantPattern(item.descMaterial);
    const existing = descriptionGroups.get(base) || [];
    existing.push(item);
    descriptionGroups.set(base, existing);
  });

  // Processar items
  const processedMap = new Map<string, ProcessedItem>();
  const variantGroups = new Map<string, VariantGroup>();

  items.forEach(item => {
    const { base } = extractVariantPattern(item.descMaterial);
    const status: ItemStatus[] = [];

    // Verificar status de quantidade
    if (item.quantidade === 0) {
      status.push('zerado');
    } else if (item.quantidade < 0) {
      status.push('negativo');
    }

    // Verificar duplicatas por código
    const codeGroup = codeGroups.get(item.codMaterial) || [];
    if (codeGroup.length > 1) {
      status.push('duplicado');
    }

    // Verificar variantes
    const descGroup = descriptionGroups.get(base) || [];
    // Um item só é variante se existem múltiplos itens com a mesma descrição base
    const hasVariants = descGroup.length > 1;

    if (hasVariants) {
      status.push('variante');

      // Criar ou atualizar grupo de variantes
      if (!variantGroups.has(base)) {
        variantGroups.set(base, {
          baseDescription: base,
          items: [],
          totalQuantity: 0
        });
      }

      const group = variantGroups.get(base)!;
      const groupId = `variant-${base}`;

      const processedItem: ProcessedItem = {
        id: `${item.codMaterial}-${Date.now()}-${Math.random()}`,
        codMaterial: item.codMaterial,
        descMaterial: item.descMaterial,
        quantidade: item.quantidade,
        estacao: item.estacao,
        rack: item.rack,
        linhaProdAlocado: item.linhaProdAlocado,
        colunaProdAlocado: item.colunaProdAlocado,
        status,
        variants: descGroup.map(i => i.codMaterial).filter(code => code !== item.codMaterial),
        totalQuantity: 0, // Will be calculated below
        groupId
      };

      group.items.push(processedItem);
      processedMap.set(processedItem.id, processedItem);
    } else {
      const processedItem: ProcessedItem = {
        id: `${item.codMaterial}-${Date.now()}-${Math.random()}`,
        codMaterial: item.codMaterial,
        descMaterial: item.descMaterial,
        quantidade: item.quantidade,
        estacao: item.estacao,
        rack: item.rack,
        linhaProdAlocado: item.linhaProdAlocado,
        colunaProdAlocado: item.colunaProdAlocado,
        status,
        totalQuantity: item.quantidade
      };

      processedMap.set(processedItem.id, processedItem);
    }
  });

  // Calcular quantidade total para cada grupo de variantes
  variantGroups.forEach(group => {
    const total = group.items.reduce((sum, item) => sum + item.quantidade, 0);
    group.totalQuantity = total;
    group.items.forEach(item => {
      item.totalQuantity = total;
    });
  });

  const result = Array.from(processedMap.values());

  // Ordenar por prioridade: negativos > zerados > variantes > duplicados > normais
  result.sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    return priorityA - priorityB;
  });

  return result;
};

const getPriority = (item: ProcessedItem): number => {
  if (item.status.includes('negativo')) return 1;
  if (item.status.includes('zerado')) return 2;
  if (item.status.includes('variante')) return 3;
  if (item.status.includes('duplicado')) return 4;
  return 5;
};

export const exportToExcel = (items: ProcessedItem[], filename: string = 'relatorio-estoque.xlsx') => {
  const exportData = items.map(item => ({
    'Código': item.codMaterial,
    'Descrição': item.descMaterial,
    'Estação': item.estacao || '-',
    'Rack': item.rack || '-',
    'Linha Prod Alocado': item.linhaProdAlocado || '-',
    'Coluna Prod Alocado': item.colunaProdAlocado || '-',
    'Total Físico': item.quantidade,
    'Total (com variantes)': item.totalQuantity,
    'Status': item.status.join(', '),
    'Variantes': item.variants ? item.variants.join(', ') : '-'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

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

/**
 * Processa planilha de análise de setores
 * Colunas: Codigo, Total - Físico, Captação...Físico, 13706/13707...Físico
 */
export const processSetoresFile = async (
  file: File
): Promise<{ items: SetorItem[]; metrics: SetorMetrics; unidade: string }> => {
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
            metrics: {
              totalItens: 0,
              captacaoPositivos: 0,
              captacaoNegativos: 0,
              captacaoZerados: 0,
              salaoPositivos: 0,
              salaoNegativos: 0,
              salaoZerados: 0,
              unidade: 'desconhecida',
              itensDivergentes: 0
            },
            unidade: 'desconhecida'
          });
          return;
        }

        const headers = rows[0].map((h: unknown) => String(h || ''));
        const result = parseSetoresData(rows, headers);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};

const parseSetoresData = (
  data: unknown[][],
  headers: string[]
): { items: SetorItem[]; metrics: SetorMetrics; unidade: string } => {
  const normalizedHeaders = headers.map(h =>
    h?.toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  // Encontrar índice da coluna Codigo
  const codigoIndex = normalizedHeaders.findIndex(h =>
    h === 'codigo' || h === 'cod material' || h.includes('codigo')
  );

  // Encontrar índice da coluna Descrição (opcional)
  const descricaoIndex = normalizedHeaders.findIndex(h =>
    h === 'descricao' || h === 'desc material' || h.includes('descricao') || h.includes('nome material')
  );

  // Encontrar índice da coluna Total - Físico
  const totalFisicoIndex = normalizedHeaders.findIndex(h =>
    h.includes('total') && h.includes('fisico') && !h.includes('captacao') && !h.includes('13706') && !h.includes('13707')
  );

  // Encontrar índice da coluna Captação (Estoque) - contém "captacao" e termina com "fisico"
  const captacaoIndex = normalizedHeaders.findIndex(h =>
    h.includes('captacao') && h.includes('fisico')
  );

  // Encontrar índice da coluna Salão de Vendas - começa com 13706 ou 13707 e termina com "fisico"
  const salaoIndex = normalizedHeaders.findIndex(h =>
    (h.includes('13706') || h.includes('13707')) && h.includes('fisico')
  );

  // Detectar unidade
  let unidade: 'palmeira' | 'penedo' | 'desconhecida' = 'desconhecida';
  const salaoHeader = headers[salaoIndex] || '';
  if (salaoHeader.includes('13706')) {
    unidade = 'palmeira';
  } else if (salaoHeader.includes('13707')) {
    unidade = 'penedo';
  }

  if (codigoIndex === -1 || totalFisicoIndex === -1) {
    console.log('Headers encontrados (setores):', normalizedHeaders);
    throw new Error('Colunas obrigatórias não encontradas: "Codigo" e "Total - Físico"');
  }

  if (captacaoIndex === -1) {
    throw new Error('Coluna de Captação (Estoque) não encontrada. Procurando por coluna que contenha "Captação" e "Físico"');
  }

  if (salaoIndex === -1) {
    throw new Error('Coluna de Salão de Vendas não encontrada. Procurando por coluna que comece com "13706" ou "13707" e contenha "Físico"');
  }

  const items: SetorItem[] = [];
  let captacaoPositivos = 0;
  let captacaoNegativos = 0;
  let captacaoZerados = 0;
  let salaoPositivos = 0;
  let salaoNegativos = 0;
  let salaoZerados = 0;
  let itensDivergentes = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.length === 0) continue;

    const codigo = String(row[codigoIndex] || '').trim();
    if (!codigo) continue;

    const descricao = descricaoIndex !== -1 ? String(row[descricaoIndex] || '').trim() : undefined;
    const totalFisico = parseNumberBR(row[totalFisicoIndex]);
    const captacao = parseNumberBR(row[captacaoIndex]);
    const salaoVendas = parseNumberBR(row[salaoIndex]);
    const diferenca = totalFisico - (captacao + salaoVendas);

    // Contabilizar métricas do Estoque (Captação)
    if (captacao > 0) captacaoPositivos++;
    else if (captacao < 0) captacaoNegativos++;
    else captacaoZerados++;

    // Contabilizar métricas do Salão de Vendas
    if (salaoVendas > 0) salaoPositivos++;
    else if (salaoVendas < 0) salaoNegativos++;
    else salaoZerados++;

    // Verificar divergência
    if (Math.abs(diferenca) > 0.01) {
      itensDivergentes++;
    }

    items.push({
      codigo,
      descricao,
      totalFisico,
      captacao,
      salaoVendas,
      unidade,
      diferenca
    });
  }

  const metrics: SetorMetrics = {
    totalItens: items.length,
    captacaoPositivos,
    captacaoNegativos,
    captacaoZerados,
    salaoPositivos,
    salaoNegativos,
    salaoZerados,
    unidade: unidade === 'palmeira' ? 'Unidade Palmeira (13706)' :
             unidade === 'penedo' ? 'Unidade Penedo (13707)' : 'Desconhecida',
    itensDivergentes
  };

  return { items, metrics, unidade };
};

export const exportSetoresToExcel = (items: SetorItem[], _unidade?: string, filename: string = 'relatorio-setores.xlsx') => {
  const exportData = items.map(item => ({
    'Código': item.codigo,
    'Descrição': item.descricao || '-',
    'Total Físico': item.totalFisico,
    'Estoque (Captação)': item.captacao,
    'Salão de Vendas': item.salaoVendas,
    'Diferença': item.diferenca,
    'Status': item.diferenca !== 0 ? 'DIVERGENTE' : 'OK'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Análise Setores');

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
