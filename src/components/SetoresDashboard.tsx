import React, { useState } from 'react';
import { Card, CardContent } from './ui/Card';
import {
  Warehouse,
  Store,
  Lock,
  PackageCheck,
  AlertTriangle,
  Download,
  Search,
  MinusCircle,
  TrendingDown
} from 'lucide-react';
import { SetorItem, SetorMetrics } from '../types';
import { cn } from '../utils/cn';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { exportSetoresToExcel } from '../utils/excelProcessor';

interface SetoresDashboardProps {
  items: SetorItem[];
  metrics: SetorMetrics;
  unidade: string;
}

type FilterType = 'all' | 'estoque-alocado' | 'estoque-disponivel' | 'estoque-zerado' | 'estoque-negativo' | 'salao-alocado' | 'salao-disponivel' | 'salao-zerado' | 'salao-negativo' | 'divergente';

const SetoresDashboard: React.FC<SetoresDashboardProps> = ({ items, metrics, unidade }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetor, setFilterSetor] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredItems = items.filter(item => {
    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCodigo = item.codigo.toLowerCase().includes(query);
      const matchesDesc = item.descricao?.toLowerCase().includes(query);
      if (!matchesCodigo && !matchesDesc) return false;
    }

    // Filtro de setor
    switch (filterSetor) {
      case 'estoque-alocado':
        return item.estoqueAlocado > 0;
      case 'estoque-disponivel':
        return item.estoqueDisponivel > 0;
      case 'estoque-zerado':
        return (item.estoqueAlocado + item.estoqueDisponivel) === 0;
      case 'estoque-negativo':
        return (item.estoqueAlocado + item.estoqueDisponivel) < 0;
      case 'salao-alocado':
        return item.salaoAlocado > 0;
      case 'salao-disponivel':
        return item.salaoDisponivel > 0;
      case 'salao-zerado':
        return (item.salaoAlocado + item.salaoDisponivel) === 0;
      case 'salao-negativo':
        return (item.salaoAlocado + item.salaoDisponivel) < 0;
      case 'divergente':
        return Math.abs(item.diferenca) > 0.01;
      default:
        return true;
    }
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleExport = () => {
    exportSetoresToExcel(filteredItems, unidade);
  };

  const toggleFilter = (filter: FilterType) => {
    setFilterSetor(prev => prev === filter ? 'all' : filter);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header com Unidade */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Análise de Setores</h2>
        <p className="text-primary-100">
          {metrics.unidade} - {metrics.totalItens.toLocaleString()} itens analisados
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Estoque (Captação) */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Warehouse className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Estoque (Captação)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'estoque-alocado' ? "bg-amber-200 ring-2 ring-amber-500" : "bg-amber-50"
                )}
                onClick={() => toggleFilter('estoque-alocado')}
              >
                <Lock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-600">
                  {metrics.estoqueAlocadoTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">Alocado</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'estoque-disponivel' ? "bg-green-200 ring-2 ring-green-500" : "bg-green-50"
                )}
                onClick={() => toggleFilter('estoque-disponivel')}
              >
                <PackageCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">
                  {metrics.estoqueDisponivelTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">Disponível</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'estoque-zerado' ? "bg-gray-200 ring-2 ring-gray-500" : "bg-gray-50"
                )}
                onClick={() => toggleFilter('estoque-zerado')}
              >
                <MinusCircle className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-600">{metrics.estoqueZerados}</p>
                <p className="text-xs text-gray-600">Zerados</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'estoque-negativo' ? "bg-red-200 ring-2 ring-red-500" : "bg-red-50"
                )}
                onClick={() => toggleFilter('estoque-negativo')}
              >
                <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{metrics.estoqueNegativos}</p>
                <p className="text-xs text-gray-600">Negativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Salão de Vendas */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Store className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Salão de Vendas</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'salao-alocado' ? "bg-amber-200 ring-2 ring-amber-500" : "bg-amber-50"
                )}
                onClick={() => toggleFilter('salao-alocado')}
              >
                <Lock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-600">
                  {metrics.salaoAlocadoTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">Alocado</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'salao-disponivel' ? "bg-green-200 ring-2 ring-green-500" : "bg-green-50"
                )}
                onClick={() => toggleFilter('salao-disponivel')}
              >
                <PackageCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">
                  {metrics.salaoDisponivelTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-600">Disponível</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'salao-zerado' ? "bg-gray-200 ring-2 ring-gray-500" : "bg-gray-50"
                )}
                onClick={() => toggleFilter('salao-zerado')}
              >
                <MinusCircle className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-600">{metrics.salaoZerados}</p>
                <p className="text-xs text-gray-600">Zerados</p>
              </div>
              <div
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                  filterSetor === 'salao-negativo' ? "bg-red-200 ring-2 ring-red-500" : "bg-red-50"
                )}
                onClick={() => toggleFilter('salao-negativo')}
              >
                <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{metrics.salaoNegativos}</p>
                <p className="text-xs text-gray-600">Negativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card de Divergências */}
      {metrics.itensDivergentes > 0 && (
        <Card
          className={cn(
            "border-l-4 border-l-orange-500 cursor-pointer transition-all hover:shadow-lg",
            filterSetor === 'divergente' && "ring-2 ring-orange-500"
          )}
          onClick={() => toggleFilter('divergente')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {metrics.itensDivergentes} itens com divergência
                </p>
                <p className="text-sm text-gray-500">
                  Total Físico (Retaguarda) diferente da soma dos setores (Alocado + Disponível)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {filterSetor !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => { setFilterSetor('all'); setCurrentPage(1); }}>
              Limpar filtro
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descrição
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Retaguarda
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">
                  Est. Alocado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">
                  Est. Disponível
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-purple-50">
                  Salão Alocado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-purple-50">
                  Salão Disponível
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Diferença
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.map((item, index) => (
                <tr
                  key={`${item.codigo}-${index}`}
                  className={cn(
                    "hover:bg-gray-50",
                    Math.abs(item.diferenca) > 0.01 && "bg-orange-50"
                  )}
                >
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {item.codigo}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">
                    {item.descricao || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">
                    {item.totalFisico.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-4 text-sm text-right bg-blue-50/30">
                    <span className={cn(
                      "font-medium",
                      item.estoqueAlocado > 0 && "text-amber-600",
                      item.estoqueAlocado === 0 && "text-gray-400"
                    )}>
                      {item.estoqueAlocado.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-right bg-blue-50/30">
                    <span className={cn(
                      "font-medium",
                      item.estoqueDisponivel > 0 && "text-green-600",
                      item.estoqueDisponivel === 0 && "text-gray-400"
                    )}>
                      {item.estoqueDisponivel.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-right bg-purple-50/30">
                    <span className={cn(
                      "font-medium",
                      item.salaoAlocado > 0 && "text-amber-600",
                      item.salaoAlocado === 0 && "text-gray-400"
                    )}>
                      {item.salaoAlocado.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-right bg-purple-50/30">
                    <span className={cn(
                      "font-medium",
                      item.salaoDisponivel > 0 && "text-green-600",
                      item.salaoDisponivel === 0 && "text-gray-400"
                    )}>
                      {item.salaoDisponivel.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-right">
                    {Math.abs(item.diferenca) > 0.01 ? (
                      <Badge variant="warning">
                        {item.diferenca > 0 ? '+' : ''}{item.diferenca.toLocaleString('pt-BR')}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} de{' '}
              {filteredItems.length} itens
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum item encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default SetoresDashboard;
