import * as XLSX from 'xlsx';
import { StockItem, ProcessedItem, ItemStatus, VariantGroup } from '../types';

export const processExcelFile = async (file: File): Promise<ProcessedItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const items = parseExcelData(jsonData as any[][]);
        const processedItems = analyzeItems(items);
        resolve(processedItems);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};

const parseExcelData = (data: any[][]): StockItem[] => {
  if (data.length < 2) return [];

  const headers = data[0].map((h: string) => h?.toString().toLowerCase().trim().replace(/\s+/g, ' '));

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
    h.includes('linha prod alocado') || h.includes('linha')
  );

  const colunaProdAlocadoIndex = headers.findIndex((h: string) =>
    h.includes('coluna prod alocado') || h.includes('coluna')
  );

  if (codMaterialIndex === -1 || descMaterialIndex === -1 || quantidadeIndex === -1) {
    console.log('Headers encontrados:', headers);
    throw new Error('Colunas obrigatórias não encontradas: "Cod Material", "Desc Material", "Total físico"');
  }

  const items: StockItem[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const codMaterial = row[codMaterialIndex]?.toString().trim();
    const descMaterial = row[descMaterialIndex]?.toString().trim();
    const quantidade = parseFloat(row[quantidadeIndex]) || 0;

    if (codMaterial && descMaterial) {
      items.push({
        codMaterial,
        descMaterial,
        quantidade,
        estacao: estacaoIndex !== -1 ? (row[estacaoIndex]?.toString().trim() || '-') : '-',
        rack: rackIndex !== -1 ? (row[rackIndex]?.toString().trim() || '-') : '-',
        linhaProdAlocado: linhaProdAlocadoIndex !== -1 ? (row[linhaProdAlocadoIndex]?.toString().trim() || '-') : '-',
        colunaProdAlocado: colunaProdAlocadoIndex !== -1 ? (row[colunaProdAlocadoIndex]?.toString().trim() || '-') : '-'
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
        variants: descGroup.map(i => i.codMaterial),
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
    'Estação': item.estacao,
    'Rack': item.rack,
    'Linha Prod Alocado': item.linhaProdAlocado,
    'Coluna Prod Alocado': item.colunaProdAlocado,
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
