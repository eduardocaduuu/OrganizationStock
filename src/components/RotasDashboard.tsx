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
  totalDificuldades: number;
  totalRetirados: number;
  valorTotal: number;
  freteTotal: number;
  distanciaMedia: number;
  color: 'purple' | 'amber';
}> = ({
  nome,
  totalPedidos,
  totalEntregues,
  totalDificuldades,
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
            <p className="text-gray-500">Dificuldades</p>
            <p className="font-semibold text-red-600">{totalDificuldades.toLocaleString('pt-BR')}</p>
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
  if (status === 'dificuldade')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Dificuldade
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
  const [sortMotoristas, setSortMotoristas] = useState<'total' | 'dificuldade' | 'distancia'>(
    'total'
  );

  // Pie chart data
  const pieData = useMemo(
    () => [
      { name: 'Entregues', value: metrics.totalEntregues, color: COLORS.entregue },
      { name: 'Dificuldades', value: metrics.totalDificuldades, color: COLORS.dificuldade },
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
          nome: m.nome.split(' ')[0], // só primeiro nome para o gráfico
          Entregues: m.entregues,
          Dificuldades: m.dificuldades,
        })),
    [motoristas]
  );

  // Motoristas ordenados pela seleção
  const motoristasSorted = useMemo(() => {
    const copy = [...motoristas];
    if (sortMotoristas === 'dificuldade') copy.sort((a, b) => b.dificuldades - a.dificuldades);
    else if (sortMotoristas === 'distancia') copy.sort((a, b) => b.distanciaMedia - a.distanciaMedia);
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

  // Top 10 motoristas com mais dificuldades (absoluto)
  const motoristasComDificuldade = useMemo(
    () =>
      [...motoristas]
        .filter(m => m.dificuldades > 0)
        .sort((a, b) => b.dificuldades - a.dificuldades)
        .slice(0, 10),
    [motoristas]
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
            title="Com Dificuldades"
            value={metrics.totalDificuldades.toLocaleString('pt-BR')}
            subtitle={`${metrics.percentualDificuldades}% dos pedidos`}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-100"
            borderColor="border-l-red-500"
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
            subtitle={`${metrics.totalOcorrencias.toLocaleString('pt-BR')} ocorrências no total`}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
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

          {/* Tipos de dificuldade */}
          {metrics.tiposDificuldade.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tipos de Dificuldade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.tiposDificuldade.slice(0, 8).map(td => {
                    const pct =
                      metrics.totalDificuldades > 0
                        ? Math.round((td.quantidade / metrics.totalDificuldades) * 100)
                        : 0;
                    return (
                      <div key={td.tipo}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-gray-700 truncate pr-2">{td.tipo}</span>
                          <span className="text-gray-500 shrink-0">
                            {td.quantidade} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tipos de Dificuldade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <CheckCircle className="h-10 w-10 mb-2 text-green-400" />
                  <p className="text-sm">Nenhuma dificuldade registrada</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
                  <Bar dataKey="Dificuldades" fill={COLORS.dificuldade} radius={[3, 3, 0, 0]} />
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
            totalDificuldades={metrics.palmeira.totalDificuldades}
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
            totalDificuldades={metrics.penedo.totalDificuldades}
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
                  onClick={() => { setSortMotoristas('dificuldade'); setMotoristaPage(0); }}
                  className={cn(
                    'px-3 py-1 rounded-full border text-xs font-medium transition-colors',
                    sortMotoristas === 'dificuldade'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-gray-300 text-gray-600 hover:border-red-400'
                  )}
                >
                  Dificuldades
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
                    <th className="text-center px-3 py-3 text-gray-600 font-medium">Dificuldades</th>
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
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              'font-medium',
                              m.dificuldades > 0 ? 'text-red-600' : 'text-gray-400'
                            )}
                          >
                            {m.dificuldades}
                          </span>
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

      {/* ── Seção 7 + 8: Rankings side by side ──────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Motoristas com maiores distâncias médias */}
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

        {/* Motoristas com mais dificuldades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Motoristas com Mais Dificuldades
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Ordenado por quantidade absoluta</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {motoristasComDificuldade.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <CheckCircle className="h-10 w-10 mb-2 text-green-400" />
                  <p className="text-sm">Nenhuma dificuldade registrada</p>
                </div>
              ) : (
                motoristasComDificuldade.map((m, i) => (
                  <div
                    key={m.nome}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          i === 0
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-semibold text-red-600">
                        {m.dificuldades} dific.
                      </p>
                      <p className="text-xs text-gray-400">
                        {m.taxaDificuldade}% dos pedidos
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Seção 9: Pedidos mais longos ─────────────────────────────────────── */}
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
