import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { RotaItem, RotasMetrics, MotoristaStats } from '../types/rotas';
import { formatDistance, formatCurrencyBR } from '../utils/rotasProcessor';
import { cn } from '../utils/cn';
import {
  CheckCircle,
  AlertTriangle,
  Package,
  Users,
  TrendingUp,
  MapPin,
  Building2,
  ChevronLeft,
  ChevronRight,
  Truck,
  Navigation,
  AlertCircle,
} from 'lucide-react';

interface RotasDashboardProps {
  items: RotaItem[];
  metrics: RotasMetrics;
  motoristas: MotoristaStats[];
}

const COLORS = {
  entregue: '#22c55e',
  dificuldade: '#ef4444',
  retirado: '#3b82f6',
  palmeira: '#8b5cf6',
  penedo: '#f59e0b',
};

const ITEMS_PER_PAGE = 10;
const OCORRENCIAS_PER_PAGE = 25;
const CAROS_PER_PAGE = 20;

// ─── Metric Card ────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  borderColor: string;
}> = ({ title, value, subtitle, icon: Icon, iconColor, iconBg, borderColor }) => (
  <Card className={cn('border-l-4', borderColor)}>
    <CardContent className="p-5">
      <div className="flex items-center gap-3">
        <div className={cn('p-3 rounded-lg shrink-0', iconBg)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Unit Card ───────────────────────────────────────────────────────────────
const UnidadeCard: React.FC<{
  nome: string;
  totalPedidos: number;
  totalEntregues: number;
  totalNaoEntregues: number;
  totalRetirados: number;
  valorTotal: number;
  freteTotal: number;
  distanciaMedia: number;
  color: 'purple' | 'amber';
}> = ({
  nome,
  totalPedidos,
  totalEntregues,
  totalNaoEntregues,
  totalRetirados,
  valorTotal,
  freteTotal,
  distanciaMedia,
  color,
}) => {
  const borderClass = color === 'purple' ? 'border-l-violet-500' : 'border-l-amber-500';
  const taxaSucesso = totalPedidos > 0 ? Math.round((totalEntregues / totalPedidos) * 100) : 0;

  return (
    <Card className={cn('border-l-4', borderClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2
            className={cn('h-5 w-5', color === 'purple' ? 'text-violet-500' : 'text-amber-500')}
          />
          {nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Total de Pedidos</p>
            <p className="font-semibold text-gray-900">{totalPedidos.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Taxa de Sucesso</p>
            <p className="font-semibold text-green-600">{taxaSucesso}%</p>
          </div>
          <div>
            <p className="text-gray-500">Entregues</p>
            <p className="font-semibold text-green-600">{totalEntregues.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Não Entregues</p>
            <p className="font-semibold text-red-600">{totalNaoEntregues.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Retirados</p>
            <p className="font-semibold text-blue-600">{totalRetirados.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Distância Média</p>
            <p className="font-semibold text-gray-700">{formatDistance(distanciaMedia)}</p>
          </div>
          <div>
            <p className="text-gray-500">Valor Total</p>
            <p className="font-semibold text-gray-700">{formatCurrencyBR(valorTotal)}</p>
          </div>
          <div>
            <p className="text-gray-500">Frete Total</p>
            <p className="font-semibold text-gray-700">{formatCurrencyBR(freteTotal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Status badge ────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'entregue')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3" />
        Entregue
      </span>
    );
  if (status === 'nao-entregue')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Não Entregue
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Package className="h-3 w-3" />
      Retirado
    </span>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const RotasDashboard: React.FC<RotasDashboardProps> = ({ items, metrics, motoristas }) => {
  const [motoristaPage, setMotoristaPage] = useState(0);
  const [sortMotoristas, setSortMotoristas] = useState<'total' | 'distancia'>('total');
  const [ocorrenciaPage, setOcorrenciaPage] = useState(0);
  const [ocorrenciaFiltroMotorista, setOcorrenciaFiltroMotorista] = useState('');
  const [ocorrenciaFiltroTipo, setOcorrenciaFiltroTipo] = useState('');
  const [carosPage, setCarosPage] = useState(0);

  // Pie chart data
  const pieData = useMemo(
    () => [
      { name: 'Entregues', value: metrics.totalEntregues, color: COLORS.entregue },
      { name: 'Não Entregues', value: metrics.totalNaoEntregues, color: COLORS.dificuldade },
      { name: 'Retirados', value: metrics.totalRetirados, color: COLORS.retirado },
    ].filter(d => d.value > 0),
    [metrics]
  );

  // Top 10 motoristas para o gráfico de barras
  const topMotoristasBar = useMemo(
    () =>
      [...motoristas]
        .sort((a, b) => b.entregues - a.entregues)
        .slice(0, 10)
        .map(m => ({
          nome: m.nome.split(' ')[0],
          Entregues: m.entregues,
          'Não Entregues': m.naoEntregues,
        })),
    [motoristas]
  );

  // Motoristas ordenados pela seleção
  const motoristasSorted = useMemo(() => {
    const copy = [...motoristas];
    if (sortMotoristas === 'distancia') copy.sort((a, b) => b.distanciaMedia - a.distanciaMedia);
    return copy;
  }, [motoristas, sortMotoristas]);

  const totalMotoristaPages = Math.ceil(motoristasSorted.length / ITEMS_PER_PAGE);
  const motoristasPaged = motoristasSorted.slice(
    motoristaPage * ITEMS_PER_PAGE,
    (motoristaPage + 1) * ITEMS_PER_PAGE
  );

  // Top 15 pedidos mais longos
  const pedidosMaisLongos = useMemo(
    () =>
      [...items]
        .filter(i => i.distanciaMetros > 0)
        .sort((a, b) => b.distanciaMetros - a.distanciaMetros)
        .slice(0, 15),
    [items]
  );

  // Top 10 motoristas com maiores distâncias médias
  const motoristasDistanciaLonga = useMemo(
    () =>
      [...motoristas]
        .filter(m => m.distanciaMedia > 0)
        .sort((a, b) => b.distanciaMedia - a.distanciaMedia)
        .slice(0, 10),
    [motoristas]
  );

  // Pedidos com ocorrências — lista base ordenada por qtd desc
  const itensComOcorrencia = useMemo(
    () =>
      items
        .filter(i => i.temOcorrencias)
        .sort((a, b) => b.quantidadeOcorrencias - a.quantidadeOcorrencias),
    [items]
  );

  // Opções únicas para os selects de filtro
  const motoristasComOcorrencia = useMemo(
    () => [...new Set(itensComOcorrencia.map(i => i.motorista).filter(Boolean))].sort(),
    [itensComOcorrencia]
  );
  const tiposOcorrenciaUnicos = useMemo(
    () => [...new Set(itensComOcorrencia.map(i => i.ultimaOcorrenciaStatus).filter(Boolean))].sort(),
    [itensComOcorrencia]
  );

  // Lista filtrada
  const itensComOcorrenciaFiltrados = useMemo(() => {
    let lista = itensComOcorrencia;
    if (ocorrenciaFiltroMotorista) lista = lista.filter(i => i.motorista === ocorrenciaFiltroMotorista);
    if (ocorrenciaFiltroTipo) lista = lista.filter(i => i.ultimaOcorrenciaStatus === ocorrenciaFiltroTipo);
    return lista;
  }, [itensComOcorrencia, ocorrenciaFiltroMotorista, ocorrenciaFiltroTipo]);

  const totalOcorrenciaPages = Math.ceil(itensComOcorrenciaFiltrados.length / OCORRENCIAS_PER_PAGE);
  const itensOcorrenciaPaged = itensComOcorrenciaFiltrados.slice(
    ocorrenciaPage * OCORRENCIAS_PER_PAGE,
    (ocorrenciaPage + 1) * OCORRENCIAS_PER_PAGE
  );

  // Top pedidos mais caros
  const pedidosMaisCaros = useMemo(
    () =>
      [...items]
        .filter(i => i.valorTotal > 0)
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 50), // paginamos em 20 por vez
    [items]
  );
  const totalCarosPages = Math.ceil(pedidosMaisCaros.length / CAROS_PER_PAGE);
  const pedidosCarosPaged = pedidosMaisCaros.slice(
    carosPage * CAROS_PER_PAGE,
    (carosPage + 1) * CAROS_PER_PAGE
  );

  // Motoristas ordenados por valor total transportado
  const motoristasporValor = useMemo(
    () =>
      [...motoristas]
        .filter(m => m.valorTotal > 0)
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 10),
    [motoristas]
  );

  return (
    <div className="space-y-8">

      {/* ── Seção 1: Resumo de Pedidos ──────────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-500" />
          Resumo de Pedidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Pedidos Analisados"
            value={metrics.totalPedidos.toLocaleString('pt-BR')}
            subtitle={`${metrics.totalItens.toLocaleString('pt-BR')} itens no total`}
            icon={Truck}
            iconColor="text-gray-600"
            iconBg="bg-gray-100"
            borderColor="border-l-gray-400"
          />
          <MetricCard
            title="Entregues com Sucesso"
            value={metrics.totalEntregues.toLocaleString('pt-BR')}
            subtitle={`${metrics.percentualEntregues}% dos pedidos`}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBg="bg-green-100"
            borderColor="border-l-green-500"
          />
          <MetricCard
            title="Retirados pelo Cliente"
            value={metrics.totalRetirados.toLocaleString('pt-BR')}
            subtitle="Cliente buscou no revendedor"
            icon={Package}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
            borderColor="border-l-blue-500"
          />
        </div>
      </section>

      {/* ── Seção 2: Análise Financeira e Distância ─────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          Análise Financeira e Distância
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Valor Total dos Pedidos"
            value={formatCurrencyBR(metrics.valorTotal)}
            subtitle="Soma de todos os pedidos"
            icon={TrendingUp}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-100"
            borderColor="border-l-indigo-500"
          />
          <MetricCard
            title="Frete Total"
            value={formatCurrencyBR(metrics.freteTotal)}
            subtitle={`Média: ${formatCurrencyBR(metrics.freteMedia)} por pedido`}
            icon={Truck}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
            borderColor="border-l-orange-500"
          />
          <MetricCard
            title="Distância Total"
            value={formatDistance(metrics.distanciaTotal)}
            subtitle="Soma de todas as rotas"
            icon={Navigation}
            iconColor="text-teal-600"
            iconBg="bg-teal-100"
            borderColor="border-l-teal-500"
          />
          <MetricCard
            title="Distância Média por Pedido"
            value={formatDistance(metrics.distanciaMedia)}
            subtitle={`${metrics.pedidosComOcorrencia.toLocaleString('pt-BR')} pedidos com ocorrência`}
            icon={MapPin}
            iconColor="text-pink-600"
            iconBg="bg-pink-100"
            borderColor="border-l-pink-500"
          />
        </div>
      </section>

      {/* ── Seção 3: Gráficos ────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          Distribuição de Status
        </h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    Number(value).toLocaleString('pt-BR'),
                    'Pedidos',
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Seção 4: Top 10 Entregas por Motorista (gráfico) ─────────────────── */}
      {topMotoristasBar.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Top 10 Motoristas — Entregas vs Dificuldades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topMotoristasBar}
                  margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="nome"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Entregues" fill={COLORS.entregue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Não Entregues" fill={COLORS.dificuldade} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Seção 5: Por Unidade ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-500" />
          Análise por Unidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UnidadeCard
            nome={metrics.palmeira.nome}
            totalPedidos={metrics.palmeira.totalPedidos}
            totalEntregues={metrics.palmeira.totalEntregues}
            totalNaoEntregues={metrics.palmeira.totalNaoEntregues}
            totalRetirados={metrics.palmeira.totalRetirados}
            valorTotal={metrics.palmeira.valorTotal}
            freteTotal={metrics.palmeira.freteTotal}
            distanciaMedia={metrics.palmeira.distanciaMedia}
            color="purple"
          />
          <UnidadeCard
            nome={metrics.penedo.nome}
            totalPedidos={metrics.penedo.totalPedidos}
            totalEntregues={metrics.penedo.totalEntregues}
            totalNaoEntregues={metrics.penedo.totalNaoEntregues}
            totalRetirados={metrics.penedo.totalRetirados}
            valorTotal={metrics.penedo.valorTotal}
            freteTotal={metrics.penedo.freteTotal}
            distanciaMedia={metrics.penedo.distanciaMedia}
            color="amber"
          />
        </div>
      </section>

      {/* ── Seção 6: Tabela completa de motoristas ───────────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Análise Completa de Motoristas ({motoristas.length})
              </CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Ordenar por:</span>
                <button
                  onClick={() => { setSortMotoristas('total'); setMotoristaPage(0); }}
                  className={cn(
                    'px-3 py-1 rounded-full border text-xs font-medium transition-colors',
                    sortMotoristas === 'total'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 text-gray-600 hover:border-primary-400'
                  )}
                >
                  Total
                </button>
                <button
                  onClick={() => { setSortMotoristas('distancia'); setMotoristaPage(0); }}
                  className={cn(
                    'px-3 py-1 rounded-full border text-xs font-medium transition-colors',
                    sortMotoristas === 'distancia'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-gray-300 text-gray-600 hover:border-teal-400'
                  )}
                >
                  Distância
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Motorista</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Total</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Entregues</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Retirados</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Sucesso</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Dist. Média</th>
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Ocorrências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {motoristasPaged.map((m, idx) => {
                    const rank = motoristaPage * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <tr key={m.nome} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{rank}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 max-w-[200px] truncate">
                            {m.nome}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-700">
                          {m.totalPedidos}
                        </td>
                        <td className="px-3 py-3 text-center text-green-600 font-medium">
                          {m.entregues}
                        </td>
                        <td className="px-3 py-3 text-center text-blue-600">{m.retirados}</td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                              m.taxaSucesso >= 80
                                ? 'bg-green-100 text-green-700'
                                : m.taxaSucesso >= 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            )}
                          >
                            {m.taxaSucesso}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 text-xs">
                          {formatDistance(m.distanciaMedia)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              m.totalOcorrencias > 0
                                ? 'text-orange-600 font-medium'
                                : 'text-gray-400'
                            )}
                          >
                            {m.totalOcorrencias}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalMotoristaPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Página {motoristaPage + 1} de {totalMotoristaPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMotoristaPage(p => p - 1)}
                    disabled={motoristaPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMotoristaPage(p => p + 1)}
                    disabled={motoristaPage >= totalMotoristaPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Seção 7: Motoristas com maiores distâncias ───────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-5 w-5 text-teal-500" />
              Motoristas com Maiores Distâncias
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Ordenado por distância média por pedido</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {motoristasDistanciaLonga.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  Sem dados de distância disponíveis
                </p>
              ) : (
                motoristasDistanciaLonga.map((m, i) => (
                  <div
                    key={m.nome}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          i === 0
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold text-teal-600">
                        {formatDistance(m.distanciaMedia)}
                      </p>
                      <p className="text-xs text-gray-400">{m.totalPedidos} pedidos</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </section>

      {/* ── Seção 9: Análise de Ocorrências ─────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Análise de Ocorrências
          {metrics.pedidosComOcorrencia > 0 && (
            <span className="text-sm font-normal text-gray-500">
              — {metrics.pedidosComOcorrencia.toLocaleString('pt-BR')} pedidos com ocorrência
              ({metrics.totalOcorrencias.toLocaleString('pt-BR')} ocorrências no total)
            </span>
          )}
        </h3>

        {metrics.pedidosComOcorrencia === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center text-gray-400">
                <CheckCircle className="h-12 w-12 mb-2 text-green-400" />
                <p className="text-sm">Nenhuma ocorrência registrada nos pedidos analisados</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Breakdown dos tipos de ocorrência */}
            {metrics.tiposOcorrencia.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tipos de Ocorrência (Última Ocorrência — Status)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.tiposOcorrencia.map(oc => {
                      const pct =
                        metrics.pedidosComOcorrencia > 0
                          ? Math.round((oc.quantidade / metrics.pedidosComOcorrencia) * 100)
                          : 0;
                      return (
                        <div key={oc.tipo}>
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-gray-700 truncate pr-2">{oc.tipo}</span>
                            <span className="text-gray-500 shrink-0">
                              {oc.quantidade} pedido{oc.quantidade !== 1 ? 's' : ''} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela de pedidos com ocorrências */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      Pedidos com Ocorrências ({itensComOcorrenciaFiltrados.length}
                      {itensComOcorrenciaFiltrados.length !== itensComOcorrencia.length && (
                        <span className="text-gray-400 font-normal"> de {itensComOcorrencia.length}</span>
                      )}
                      )
                    </CardTitle>
                    {(ocorrenciaFiltroMotorista || ocorrenciaFiltroTipo) && (
                      <button
                        onClick={() => {
                          setOcorrenciaFiltroMotorista('');
                          setOcorrenciaFiltroTipo('');
                          setOcorrenciaPage(0);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={ocorrenciaFiltroMotorista}
                      onChange={e => { setOcorrenciaFiltroMotorista(e.target.value); setOcorrenciaPage(0); }}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      <option value="">Todos os motoristas</option>
                      {motoristasComOcorrencia.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={ocorrenciaFiltroTipo}
                      onChange={e => { setOcorrenciaFiltroTipo(e.target.value); setOcorrenciaPage(0); }}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      <option value="">Todos os tipos</option>
                      {tiposOcorrenciaUnicos.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Pedido</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Motorista</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Município / UF</th>
                        <th className="text-center px-3 py-3 text-gray-600 font-medium">Qtd</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Última Ocorrência (Status)</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-medium">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itensOcorrenciaPaged.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                            Nenhum pedido encontrado com os filtros selecionados
                          </td>
                        </tr>
                      )}
                      {itensOcorrenciaPaged.map(item => (
                        <tr key={item.id} className="hover:bg-orange-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">
                            {item.pedido || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate">
                            {item.motorista || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{item.municipio || '—'}</p>
                            <p className="text-xs text-gray-400">{item.uf}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                              {item.quantidadeOcorrencias}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.ultimaOcorrenciaStatus ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
                                {item.ultimaOcorrenciaStatus}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 max-w-[260px]">
                            {item.ultimaOcorrenciaMensagem ? (
                              <span title={item.ultimaOcorrenciaMensagem} className="line-clamp-2">
                                {item.ultimaOcorrenciaMensagem}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalOcorrenciaPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Página {ocorrenciaPage + 1} de {totalOcorrenciaPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOcorrenciaPage(p => p - 1)}
                        disabled={ocorrenciaPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOcorrenciaPage(p => p + 1)}
                        disabled={ocorrenciaPage >= totalOcorrenciaPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ── Seção 10: Pedidos mais caros ─────────────────────────────────────── */}
      {pedidosMaisCaros.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Pedidos Mais Caros
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Ranking de motoristas por valor transportado */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Motoristas por Valor Transportado
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Top 10 — soma de todos os pedidos</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {motoristasporValor.map((m, i) => (
                    <div
                      key={m.nome}
                      className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                            i === 0
                              ? 'bg-indigo-500 text-white'
                              : i === 1
                              ? 'bg-indigo-200 text-indigo-700'
                              : i === 2
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                          <p className="text-xs text-gray-400">{m.totalPedidos} pedidos</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-semibold text-indigo-600">
                          {formatCurrencyBR(m.valorTotal)}
                        </p>
                        <p className="text-xs text-gray-400">
                          méd. {formatCurrencyBR(m.valorTotal / m.totalPedidos)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tabela dos pedidos mais caros */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Top {pedidosMaisCaros.length} Pedidos por Valor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">#</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">Pedido</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">Município / UF</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">Motorista</th>
                        <th className="text-center px-3 py-3 text-gray-600 font-medium">Status</th>
                        <th className="text-right px-3 py-3 text-gray-600 font-medium">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pedidosCarosPaged.map((item, i) => (
                        <tr key={item.id} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-3 py-3 text-gray-400 text-xs">
                            {carosPage * CAROS_PER_PAGE + i + 1}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-700">
                            {item.pedido || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-800">{item.municipio || '—'}</p>
                            <p className="text-xs text-gray-400">{item.uf}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-700 max-w-[160px] truncate text-xs">
                            {item.motorista || '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-indigo-600">
                            {formatCurrencyBR(item.valorTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalCarosPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Página {carosPage + 1} de {totalCarosPages}
                      {' '}· mostrando {pedidosCarosPaged.length} de {pedidosMaisCaros.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCarosPage(p => p - 1)}
                        disabled={carosPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCarosPage(p => p + 1)}
                        disabled={carosPage >= totalCarosPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── Seção 11: Pedidos mais longos ────────────────────────────────────── */}
      {pedidosMaisLongos.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                Top {pedidosMaisLongos.length} Pedidos com Maiores Distâncias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Pedido</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Município / UF</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Motorista</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Distância</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pedidosMaisLongos.map((item, i) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {item.pedido || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{item.municipio || '—'}</p>
                          <p className="text-xs text-gray-400">{item.uf}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                          {item.motorista || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-teal-600">
                          {formatDistance(item.distanciaMetros)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 text-xs">
                          {item.valorTotal > 0 ? formatCurrencyBR(item.valorTotal) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

export default RotasDashboard;
