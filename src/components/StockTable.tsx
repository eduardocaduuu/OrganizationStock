import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedItem, ItemStatus } from '../types';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { ChevronDown, ChevronUp, Search, Filter, Download, Printer } from 'lucide-react';
import { cn } from '../utils/cn';
import { exportToExcel } from '../utils/excelProcessor';

interface StockTableProps {
  items: ProcessedItem[];
  externalFilter?: FilterStatus;
  template?: 'legacy' | 'disponivel';
}

type SortField = 'codMaterial' | 'descMaterial' | 'quantidade' | 'totalQuantity' | 'estacao' | 'rack';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | ItemStatus;

const StockTable: React.FC<StockTableProps> = ({ items, externalFilter, template = 'legacy' }) => {
  const [sortField, setSortField] = useState<SortField>('codMaterial');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(externalFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Verifica se deve mostrar colunas de localização
  const showLocationColumns = template !== 'disponivel';
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const itemsPerPage = 20;

  // Sincronizar filtro externo
  useEffect(() => {
    if (externalFilter) {
      setFilterStatus(externalFilter);
      setCurrentPage(1);
    }
  }, [externalFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filtrar por status
    if (filterStatus !== 'all') {
      result = result.filter(item => item.status.includes(filterStatus));
    }

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.codMaterial.toLowerCase().includes(query) ||
          item.descMaterial.toLowerCase().includes(query)
      );
    }

    // Ordenar
    result.sort((a, b) => {
      let aValue: string | number = a[sortField] ?? '';
      let bValue: string | number = b[sortField] ?? '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, filterStatus, searchQuery, sortField, sortOrder]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  const getStatusBadge = (status: ItemStatus) => {
    const config = {
      zerado: { label: 'Zerado', variant: 'danger' as const },
      negativo: { label: 'Negativo', variant: 'warning' as const },
      duplicado: { label: 'Duplicado', variant: 'info' as const },
      variante: { label: 'Variante', variant: 'default' as const },
    };

    const { label, variant } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getRowColor = (item: ProcessedItem) => {
    if (item.status.includes('negativo')) return 'bg-orange-50 hover:bg-orange-100';
    if (item.status.includes('zerado')) return 'bg-red-50 hover:bg-red-100';
    if (item.status.includes('variante')) return 'bg-purple-50 hover:bg-purple-100';
    return 'bg-white hover:bg-gray-50';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const handleExport = () => {
    exportToExcel(filteredAndSortedItems);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
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

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="zerado">Zerado</option>
              <option value="negativo">Negativo</option>
              <option value="duplicado">Duplicado</option>
              <option value="variante">Variante</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:inline-flex">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="print-section bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('codMaterial')} className="flex items-center hover:text-gray-700">
                    Código
                    <SortIcon field="codMaterial" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('descMaterial')} className="flex items-center hover:text-gray-700">
                    Descrição
                    <SortIcon field="descMaterial" />
                  </button>
                </th>
                {showLocationColumns && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('estacao')} className="flex items-center hover:text-gray-700">
                        Estação
                        <SortIcon field="estacao" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('rack')} className="flex items-center hover:text-gray-700">
                        Rack
                        <SortIcon field="rack" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Linha Prod
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coluna Prod
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('quantidade')} className="flex items-center hover:text-gray-700">
                    {showLocationColumns ? 'Total Físico' : 'Total Disponível'}
                    <SortIcon field="quantidade" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('totalQuantity')} className="flex items-center hover:text-gray-700">
                    Total (c/ Variantes)
                    <SortIcon field="totalQuantity" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={cn('transition-colors', getRowColor(item))}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.codMaterial}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.descMaterial}
                    </td>
                    {showLocationColumns && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.estacao || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.rack || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.linhaProdAlocado || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.colunaProdAlocado || '-'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={cn(
                        'font-semibold',
                        item.quantidade === 0 && 'text-red-600',
                        item.quantidade < 0 && 'text-orange-600'
                      )}>
                        {item.quantidade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalQuantity !== item.quantidade ? (
                        <span className="font-semibold text-purple-600">
                          {item.totalQuantity}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap">
                        {item.status.map((status, idx) => (
                          <span key={idx}>{getStatusBadge(status)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.variants && item.variants.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(item.id)}
                        >
                          {expandedRows.has(item.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Ver Variantes
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && item.variants && (
                    <tr className={getRowColor(item)}>
                      <td colSpan={showLocationColumns ? 10 : 6} className="px-6 py-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Códigos das Variantes:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.variants.map((variant, idx) => (
                              <Badge key={idx} variant="info">
                                {variant}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} de{' '}
              {filteredAndSortedItems.length} itens
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
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
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

      {filteredAndSortedItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum item encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default StockTable;
