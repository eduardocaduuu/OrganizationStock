import { useState, useCallback } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import StockTable from './components/StockTable';
import MissingAddressModal from './components/MissingAddressModal';
import Alert from './components/ui/Alert';
import { ProcessedItem, DashboardMetrics, ExcelTemplate } from './types';
import { processExcelFile } from './utils/excelProcessor';

function App() {
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'positivo' | 'zerado' | 'negativo' | 'duplicado' | 'sem-endereco'>('all');
  const [detectedTemplate, setDetectedTemplate] = useState<'legacy' | 'disponivel'>('legacy');
  const [showMissingAddressModal, setShowMissingAddressModal] = useState(false);

  const hasNoAddress = (item: ProcessedItem): boolean => {
    const estacaoVazia = !item.estacao || item.estacao === '-' || item.estacao.trim() === '';
    const rackVazio = !item.rack || item.rack === '-' || item.rack.trim() === '';
    const linhaVazia = !item.linhaProdAlocado || item.linhaProdAlocado === '-' || item.linhaProdAlocado.trim() === '';
    const colunaVazia = !item.colunaProdAlocado || item.colunaProdAlocado === '-' || item.colunaProdAlocado.trim() === '';
    return estacaoVazia && rackVazio && linhaVazia && colunaVazia;
  };

  // Itens sem endereço com estoque > 0 (exclui zerados e negativos)
  const isAddressEmptyWithStock = (item: ProcessedItem): boolean => {
    return hasNoAddress(item) && item.quantidade > 0;
  };

  const calculateMetrics = (items: ProcessedItem[]): DashboardMetrics => {
    const uniqueGroups = new Set<string>();
    let itensPositivos = 0;
    let itemsZerados = 0;
    let itemsNegativos = 0;
    let itensSemEndereco = 0;

    items.forEach(item => {
      if (item.quantidade > 0) itensPositivos++;
      if (item.quantidade === 0) itemsZerados++;
      if (item.quantidade < 0) itemsNegativos++;
      if (isAddressEmptyWithStock(item)) itensSemEndereco++;

      if (item.status.includes('duplicado') || item.status.includes('variante')) {
        if (item.groupId) {
          uniqueGroups.add(item.groupId);
        } else {
          uniqueGroups.add(item.codMaterial);
        }
      }
    });

    // Calcula percentual sobre itens com estoque > 0
    const percentualSemEndereco = itensPositivos > 0
      ? Math.round((itensSemEndereco / itensPositivos) * 100)
      : 0;

    return {
      totalItems: items.length,
      itensPositivos,
      itemsZerados,
      itemsNegativos,
      gruposDuplicados: uniqueGroups.size,
      itensSemEndereco,
      percentualSemEndereco,
    };
  };

  const handleFileSelect = useCallback(async (file: File, template: ExcelTemplate) => {
    setLoading(true);
    setError(null);

    try {
      const result = await processExcelFile(file, template);
      setItems(result.items);
      setDetectedTemplate(result.detectedTemplate);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao processar arquivo. Verifique se o formato está correto.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const metrics = items.length > 0 ? calculateMetrics(items) : {
    totalItems: 0,
    itensPositivos: 0,
    itemsZerados: 0,
    itemsNegativos: 0,
    gruposDuplicados: 0,
    itensSemEndereco: 0,
    percentualSemEndereco: 0,
  };

  const itemsSemEndereco = items.filter(isAddressEmptyWithStock);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Upload Section */}
        <section>
          <FileUpload onFileSelect={handleFileSelect} loading={loading} />
        </section>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger">
            <strong>Erro:</strong> {error}
          </Alert>
        )}

        {/* Dashboard & Table */}
        {items.length > 0 && (
          <>
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Métricas do Estoque
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Clique nos cards abaixo para filtrar os itens
              </p>
              <Dashboard
                metrics={metrics}
                onCardClick={setActiveFilter}
                activeFilter={activeFilter}
                showAddressMetrics={detectedTemplate === 'legacy'}
                onViewMissingAddress={() => setShowMissingAddressModal(true)}
              />
            </section>

            {(metrics.itemsZerados > 0 || metrics.itemsNegativos > 0) && (
              <Alert variant="warning">
                <div>
                  <strong>Atenção!</strong> Foram detectados itens críticos no estoque:
                  {metrics.itemsNegativos > 0 && (
                    <div className="mt-1">
                      • {metrics.itemsNegativos} item(ns) com estoque negativo
                    </div>
                  )}
                  {metrics.itemsZerados > 0 && (
                    <div className="mt-1">
                      • {metrics.itemsZerados} item(ns) com estoque zerado
                    </div>
                  )}
                </div>
              </Alert>
            )}

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Análise Detalhada
                {activeFilter !== 'all' && (
                  <span className="ml-2 text-base font-normal text-gray-600">
                    (Filtro: {activeFilter === 'positivo' ? 'Estoque Positivo' :
                             activeFilter === 'zerado' ? 'Estoque Zerado' :
                             activeFilter === 'negativo' ? 'Estoque Negativo' :
                             activeFilter === 'sem-endereco' ? 'Itens sem Endereço' :
                             'Duplicados/Variantes'})
                  </span>
                )}
              </h2>
              <StockTable items={items} externalFilter={activeFilter} template={detectedTemplate} />
            </section>
          </>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-primary-50 rounded-full mb-4">
              <svg
                className="h-16 w-16 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum arquivo carregado
            </h3>
            <p className="text-gray-500">
              Faça upload de uma planilha Excel para começar a análise
            </p>
          </div>
        )}
      </main>

      <footer className="bg-primary-900 text-white mt-16 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary-200">
            Sistema de Controle de Estoque - {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Modal de itens sem endereço */}
      <MissingAddressModal
        isOpen={showMissingAddressModal}
        onClose={() => setShowMissingAddressModal(false)}
        items={itemsSemEndereco}
        percentage={metrics.percentualSemEndereco}
      />
    </div>
  );
}

export default App;
