import React from 'react';
import { X, MapPinOff, Download } from 'lucide-react';
import { ProcessedItem } from '../types';
import Button from './ui/Button';
import Badge from './ui/Badge';
import * as XLSX from 'xlsx';

interface MissingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcessedItem[];
  percentage: number;
}

const MissingAddressModal: React.FC<MissingAddressModalProps> = ({
  isOpen,
  onClose,
  items,
  percentage
}) => {
  if (!isOpen) return null;

  const exportToExcel = () => {
    const exportData = items.map(item => ({
      'Código': item.codMaterial,
      'Descrição': item.descMaterial,
      'Quantidade': item.quantidade,
      'Estação': item.estacao || '-',
      'Rack': item.rack || '-',
      'Linha Prod': item.linhaProdAlocado || '-',
      'Coluna Prod': item.colunaProdAlocado || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens sem Endereço');

    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key as keyof typeof row]).length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'itens-sem-endereco.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <MapPinOff className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Itens sem Endereço
                  </h2>
                  <p className="text-sm text-gray-600">
                    {items.length} itens ({percentage}% do total) não possuem localização definida
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-3 bg-gray-50 border-b flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Lista
            </Button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-180px)]">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">
                    Código
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">
                    Descrição
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">
                    Quantidade
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {item.codMaterial}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {item.descMaterial}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-medium">
                      <span className={
                        item.quantidade < 0
                          ? 'text-orange-600'
                          : item.quantidade === 0
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }>
                        {item.quantidade.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {item.status.map((status, idx) => (
                          <Badge
                            key={idx}
                            variant={
                              status === 'negativo'
                                ? 'warning'
                                : status === 'zerado'
                                ? 'danger'
                                : status === 'duplicado'
                                ? 'info'
                                : 'default'
                            }
                          >
                            {status}
                          </Badge>
                        ))}
                        {item.status.length === 0 && (
                          <Badge variant="success">ok</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Esses itens precisam ter seu endereço cadastrado no sistema.
              </p>
              <Button variant="default" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingAddressModal;
