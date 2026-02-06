/**
 * Tipos para análise de tempo de vida de pedidos
 */

export type PedidoStatus = 'no-prazo' | 'atrasado';

export interface PedidoItem {
  id: string;
  codigoPedido: string;
  valorPraticado: number;
  dataAprovacao: Date;
  dataAprovacaoOriginal: Date; // Data original antes de ajuste para dia útil
  dataFaturamento: Date;
  diasUteis: number;           // Dias úteis entre aprovação (ajustada) e faturamento
  dentroDosPrazo: boolean;     // true se <= 1 dia útil
  status: PedidoStatus;
}

export interface PedidosMetrics {
  totalPedidos: number;
  valorTotal: number;
  pedidosNoPrazo: number;
  pedidosAtrasados: number;
  percentualNoPrazo: number;
  percentualAtrasados: number;
  tempoMedioDiasUteis: number;
  valorNoPrazo: number;
  valorAtrasados: number;
}

export interface DistribuicaoAtraso {
  diasAtraso: string;  // Ex: "1 dia", "2 dias", "3+ dias"
  quantidade: number;
  percentual: number;
}

export interface PedidosResult {
  items: PedidoItem[];
  metrics: PedidosMetrics;
  distribuicaoAtraso: DistribuicaoAtraso[];
}
