export type RotaStatus = 'entregue' | 'dificuldade' | 'retirado';
export type RotaUnidade = 'palmeira' | 'penedo' | 'desconhecida';

export interface RotaItem {
  id: string;
  pedido: string;
  nome: string;
  municipio: string;
  uf: string;
  bairro: string;
  itens: number;
  valorTotal: number;
  status: RotaStatus;
  statusOriginal: string;
  motorista: string;
  expedidor: string;
  unidade: RotaUnidade;
  temOcorrencias: boolean;
  ultimaOcorrenciaStatus: string;
  ultimaOcorrenciaMensagem: string;
  quantidadeOcorrencias: number;
  distanciaMetros: number;
  precoFrete: number;
}

export interface MotoristaStats {
  nome: string;
  totalPedidos: number;
  entregues: number;
  dificuldades: number;
  retirados: number;
  taxaSucesso: number;
  taxaDificuldade: number;
  distanciaTotal: number;
  distanciaMedia: number;
  totalOcorrencias: number;
  freteTotal: number;
  valorTotal: number;
  unidades: string[];
}

export interface RotasUnidadeMetrics {
  nome: string;
  totalPedidos: number;
  totalEntregues: number;
  totalDificuldades: number;
  totalRetirados: number;
  valorTotal: number;
  freteTotal: number;
  distanciaMedia: number;
  distanciaTotal: number;
}

export interface RotasMetrics {
  totalPedidos: number;
  totalEntregues: number;
  totalDificuldades: number;
  totalRetirados: number;
  percentualEntregues: number;
  percentualDificuldades: number;
  totalOcorrencias: number;
  valorTotal: number;
  freteTotal: number;
  freteMedia: number;
  distanciaTotal: number;
  distanciaMedia: number;
  totalItens: number;
  tiposDificuldade: { tipo: string; quantidade: number }[];
  palmeira: RotasUnidadeMetrics;
  penedo: RotasUnidadeMetrics;
}

export interface RotasResult {
  items: RotaItem[];
  metrics: RotasMetrics;
  motoristas: MotoristaStats[];
}
