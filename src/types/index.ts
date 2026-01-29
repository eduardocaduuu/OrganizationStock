export type ExcelTemplate = 'auto' | 'legacy' | 'disponivel' | 'setores';

export interface StockItem {
  codMaterial: string;
  descMaterial: string;
  quantidade: number;
  estacao?: string;
  rack?: string;
  linhaProdAlocado?: string;
  colunaProdAlocado?: string;
}

export interface ProcessedItem extends StockItem {
  id: string;
  status: ItemStatus[];
  variants?: string[]; // Códigos das variantes
  totalQuantity: number; // Quantidade total incluindo variantes
  groupId?: string; // ID do grupo de variantes
}

export type ItemStatus = 'zerado' | 'negativo' | 'duplicado' | 'variante';

export interface DashboardMetrics {
  totalItems: number;
  itensPositivos: number;
  itemsZerados: number;
  itemsNegativos: number;
  gruposDuplicados: number;
  itensSemEndereco: number;
  percentualSemEndereco: number;
}

export interface VariantGroup {
  baseDescription: string;
  items: ProcessedItem[];
  totalQuantity: number;
}

// Tipos para análise de setores
export interface SetorItem {
  codigo: string;
  descricao?: string;
  totalFisico: number;
  // Estoque (Captação)
  estoqueAlocado: number;
  estoqueDisponivel: number;
  // Salão de Vendas
  salaoAlocado: number;
  salaoDisponivel: number;
  unidade: 'palmeira' | 'penedo' | 'desconhecida';
  diferenca: number; // totalFisico - (estoqueAlocado + estoqueDisponivel + salaoAlocado + salaoDisponivel)
}

export interface SetorMetrics {
  totalItens: number;
  // Totais do Estoque (Captação)
  estoqueAlocadoTotal: number;
  estoqueDisponivelTotal: number;
  estoqueZerados: number;
  estoqueNegativos: number;
  // Totais do Salão de Vendas
  salaoAlocadoTotal: number;
  salaoDisponivelTotal: number;
  salaoZerados: number;
  salaoNegativos: number;
  // Unidade detectada
  unidade: string;
  // Itens com divergência
  itensDivergentes: number;
}
