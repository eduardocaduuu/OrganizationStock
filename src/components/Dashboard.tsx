import React from 'react';
import { Card, CardContent } from './ui/Card';
import { AlertTriangle, MinusCircle, Package, Copy, MapPinOff, TrendingUp } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { cn } from '../utils/cn';

interface DashboardProps {
  metrics: DashboardMetrics;
  onCardClick?: (filter: 'all' | 'positivo' | 'zerado' | 'negativo' | 'duplicado' | 'sem-endereco') => void;
  activeFilter?: string;
  showAddressMetrics?: boolean;
  onViewMissingAddress?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  onCardClick,
  activeFilter = 'all',
  showAddressMetrics = false,
  onViewMissingAddress
}) => {
  const baseCards = [
    {
      title: 'Total de Itens Únicos',
      value: metrics.totalItems,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filter: 'all' as const,
    },
    {
      title: 'Itens com Estoque Positivo',
      value: metrics.itensPositivos,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      filter: 'positivo' as const,
    },
    {
      title: 'Itens com Estoque Zerado',
      value: metrics.itemsZerados,
      icon: MinusCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      alert: metrics.itemsZerados > 0,
      filter: 'zerado' as const,
    },
    {
      title: 'Itens com Estoque Negativo',
      value: metrics.itemsNegativos,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      alert: metrics.itemsNegativos > 0,
      filter: 'negativo' as const,
    },
    {
      title: 'Grupos com Duplicatas/Variantes',
      value: metrics.gruposDuplicados,
      icon: Copy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      filter: 'duplicado' as const,
    },
  ];

  const cards = showAddressMetrics
    ? [
        ...baseCards,
        {
          title: 'Itens sem Endereço',
          value: metrics.itensSemEndereco,
          icon: MapPinOff,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          alert: metrics.itensSemEndereco > 0,
          filter: 'sem-endereco' as const,
          percentage: metrics.percentualSemEndereco,
          showViewButton: true,
        },
      ]
    : baseCards;

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
      showAddressMetrics ? "xl:grid-cols-6" : "xl:grid-cols-5"
    )}>
      {cards.map((card, index) => (
        <Card
          key={index}
          className={cn(
            'transition-all cursor-pointer hover:shadow-lg',
            card.alert && card.filter === 'sem-endereco' ? 'border-l-4 border-l-yellow-500' : card.alert && 'border-l-4 border-l-red-500',
            activeFilter === card.filter && 'ring-2 ring-primary-500 shadow-lg'
          )}
          onClick={() => onCardClick?.(card.filter)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {card.value.toLocaleString()}
                  </p>
                  {'percentage' in card && card.percentage !== undefined && (
                    <span className="text-lg font-semibold text-yellow-600">
                      ({card.percentage}%)
                    </span>
                  )}
                </div>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </div>
            {card.alert && card.filter !== 'sem-endereco' && (
              <div className="mt-3 flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Atenção necessária</span>
              </div>
            )}
            {'showViewButton' in card && card.showViewButton && card.value > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMissingAddress?.();
                }}
                className="mt-3 w-full text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md py-2 px-3 transition-colors"
              >
                Ver itens sem endereço
              </button>
            )}
            {activeFilter === card.filter && (
              <div className="mt-3 flex items-center gap-1 text-primary-600">
                <span className="text-xs font-medium">✓ Filtro ativo</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Dashboard;
