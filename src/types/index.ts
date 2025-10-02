export interface StockItem {
  codMaterial: string;
  descMaterial: string;
  quantidade: number;
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
  itemsZerados: number;
  itemsNegativos: number;
  gruposDuplicados: number;
}

export interface VariantGroup {
  baseDescription: string;
  items: ProcessedItem[];
  totalQuantity: number;
}
