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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { PedidoItem, PedidosMetrics, UnidadeMetrics, DistribuicaoAtraso } from '../types/pedidos';
import { formatCurrency, formatDate, exportPedidosToExcel, getNomeUnidade } from '../utils/pedidosProcessor';
import { cn } from '../utils/cn';
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
} from 'lucide-react';

interface PedidosDashboardProps {
  items: PedidoItem[];
  metrics: PedidosMetrics;
  metricsPalmeira: UnidadeMetrics;
  metricsPenedo: UnidadeMetrics;
  distribuicaoAtraso: DistribuicaoAtraso[];
  distribuicaoAtrasoPalmeira: DistribuicaoAtraso[];
  distribuicaoAtrasoPenedo: DistribuicaoAtraso[];
}

const COLORS = {
  noPrazo: '#22c55e',    // green-500
  atrasado: '#ef4444',   // red-500
  palmeira: '#3b82f6',   // blue-500
  penedo: '#8b5cf6',     // violet-500
};

const ITEMS_PER_PAGE = 10;

// Componente para exibir métricas de uma unidade
const UnidadeCard: React.FC<{
  metrics: UnidadeMetrics;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = ({ metrics, icon: Icon, color, bgColor }) => (
  <Card className={cn('border-l-4', color === 'blue' ? 'border-l-blue-500' : 'border-l-violet-500')}>
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color === 'blue' ? 'text-blue-600' : 'text-violet-600')} />
        </div>
        <CardTitle className="text-lg">{metrics.nomeUnidade}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total de Pedidos</p>
          <p className="text-xl font-bold">{metrics.totalPedidos.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Valor Total</p>
          <p className="text-lg font-bold text-gray-700">{formatCurrency(metrics.valorTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-green-700">No Prazo</p>
          <p className="text-xl font-bold text-green-600">{metrics.pedidosNoPrazo}</p>
          <p className="text-xs text-green-600">({metrics.percentualNoPrazo}%)</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-xs text-red-700">Atrasados</p>
          <p className="text-xl font-bold text-red-600">{metrics.pedidosAtrasados}</p>
          <p className="text-xs text-red-600">({metrics.percentualAtrasados}%)</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          Tempo médio: <strong>{metrics.tempoMedioDiasUteis} dias úteis</strong>
        </span>
      </div>
    </CardContent>
  </Card>
);

const PedidosDashboard: React.FC<PedidosDashboardProps> = ({
  items,
  metrics,
  metricsPalmeira,
  metricsPenedo,
  distribuicaoAtraso,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyAtrasados, setShowOnlyAtrasados] = useState(false);
  const [filtroUnidade, setFiltroUnidade] = useState<'todos' | 'palmeira' | 'penedo'>('todos');

  // Dados para o gráfico de pizza (geral)
  const pieData = useMemo(() => [
    { name: 'No Prazo', value: metrics.pedidosNoPrazo, color: COLORS.noPrazo },
    { name: 'Atrasados', value: metrics.pedidosAtrasados, color: COLORS.atrasado },
  ], [metrics]);

  // Dados para comparativo de unidades
  const comparativoUnidades = useMemo(() => [
    {
      name: 'Palmeira dos Índios',
      pedidos: metricsPalmeira.totalPedidos,
      noPrazo: metricsPalmeira.pedidosNoPrazo,
      atrasados: metricsPalmeira.pedidosAtrasados,
      tempoMedio: metricsPalmeira.tempoMedioDiasUteis,
    },
    {
      name: 'Penedo',
      pedidos: metricsPenedo.totalPedidos,
      noPrazo: metricsPenedo.pedidosNoPrazo,
      atrasados: metricsPenedo.pedidosAtrasados,
      tempoMedio: metricsPenedo.tempoMedioDiasUteis,
    },
  ], [metricsPalmeira, metricsPenedo]);

  // Dados para gráfico de barras - distribuição de atraso
  const barData = useMemo(() =>
    distribuicaoAtraso.map(d => ({
      name: d.diasAtraso,
      quantidade: d.quantidade,
      percentual: d.percentual,
    })),
    [distribuicaoAtraso]
  );

  // Filtrar e paginar itens
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (filtroUnidade !== 'todos') {
      filtered = filtered.filter(i => i.unidade === filtroUnidade);
    }

    if (showOnlyAtrasados) {
      filtered = filtered.filter(i => i.status === 'atrasado');
    }

    return filtered;
  }, [items, showOnlyAtrasados, filtroUnidade]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [showOnlyAtrasados, filtroUnidade]);

  const handleExport = () => {
    exportPedidosToExcel(filteredItems, 'relatorio-pedidos.xlsx');
  };

  const handleExportAtrasados = () => {
    const atrasados = items.filter(i => i.status === 'atrasado');
    exportPedidosToExcel(atrasados, 'pedidos-atrasados.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total de Pedidos</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalPedidos.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.valorTotal)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">No Prazo (24h)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-green-600">{metrics.pedidosNoPrazo.toLocaleString()}</p>
                  <span className="text-lg font-semibold text-green-600">({metrics.percentualNoPrazo}%)</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Atrasados</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-red-600">{metrics.pedidosAtrasados.toLocaleString()}</p>
                  <span className="text-lg font-semibold text-red-600">({metrics.percentualAtrasados}%)</span>
                </div>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas por Unidade */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-600" />
          Métricas por Unidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UnidadeCard
            metrics={metricsPalmeira}
            icon={MapPin}
            color="blue"
            bgColor="bg-blue-100"
          />
          <UnidadeCard
            metrics={metricsPenedo}
            icon={MapPin}
            color="violet"
            bgColor="bg-violet-100"
          />
        </div>
      </div>

      {/* Tempo Médio Geral */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio de Faturamento (Geral)</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.tempoMedioDiasUteis} {metrics.tempoMedioDiasUteis === 1 ? 'dia útil' : 'dias úteis'}
              </p>
              <p className="text-xs text-gray-500">Meta: 1 dia útil (24 horas)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Geral de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [(value as number).toLocaleString(), 'Pedidos']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Comparativo de Unidades */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoUnidades}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="noPrazo" name="No Prazo" fill={COLORS.noPrazo} />
                  <Bar dataKey="atrasados" name="Atrasados" fill={COLORS.atrasado} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Distribuição de Atrasos */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Atrasos (dias além do prazo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'quantidade' ? (value as number).toLocaleString() : `${value}%`,
                      name === 'quantidade' ? 'Pedidos' : 'Percentual'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="quantidade" name="Quantidade" fill={COLORS.atrasado} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhum pedido atrasado!</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pedidos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Lista de Pedidos</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro de Unidade */}
              <select
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value as 'todos' | 'palmeira' | 'penedo')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="todos">Todas as Unidades</option>
                <option value="palmeira">Palmeira dos Índios</option>
                <option value="penedo">Penedo</option>
              </select>

              <Button
                variant={showOnlyAtrasados ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOnlyAtrasados(!showOnlyAtrasados)}
              >
                {showOnlyAtrasados ? 'Mostrar Todos' : 'Apenas Atrasados'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
              {metrics.pedidosAtrasados > 0 && (
                <Button variant="danger" size="sm" onClick={handleExportAtrasados}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar Atrasados
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Unidade</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Data Aprovação</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Data Faturamento</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Dias Úteis</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b hover:bg-gray-50 transition-colors',
                      item.status === 'atrasado' && 'bg-red-50'
                    )}
                  >
                    <td className="py-3 px-4 font-medium">{item.codigoPedido}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        item.unidade === 'palmeira' ? 'bg-blue-100 text-blue-800' :
                        item.unidade === 'penedo' ? 'bg-violet-100 text-violet-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {getNomeUnidade(item.unidade)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatCurrency(item.valorPraticado)}</td>
                    <td className="py-3 px-4">{formatDate(item.dataAprovacaoOriginal)}</td>
                    <td className="py-3 px-4">{formatDate(item.dataFaturamento)}</td>
                    <td className="py-3 px-4 text-center">{item.diasUteis}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          item.status === 'no-prazo'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        {item.status === 'no-prazo' ? 'No Prazo' : 'Atrasado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} de{' '}
                {filteredItems.length} pedidos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PedidosDashboard;
