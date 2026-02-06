import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Package, MapPin, Building2, Clock } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardContent } from './ui/Card';
import { ExcelTemplate } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File, template: ExcelTemplate) => void;
  loading?: boolean;
}

interface UploadCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  template: ExcelTemplate;
  selectedFile: File | null;
  loading: boolean;
  onFileSelect: (file: File, template: ExcelTemplate) => void;
  onClearFile: () => void;
  inputId: string;
}

const UploadCard: React.FC<UploadCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBgColor,
  template,
  selectedFile,
  loading,
  onFileSelect,
  onClearFile,
  inputId
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        onFileSelect(file, template);
      } else {
        alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      }
    }
  }, [onFileSelect, template]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onFileSelect(file, template);
    }
  }, [onFileSelect, template]);

  const handleCardClick = () => {
    if (!selectedFile && !loading) {
      inputRef.current?.click();
    }
  };

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:shadow-lg border-2',
        dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-400',
        selectedFile && 'border-green-500 bg-green-50',
        loading && 'opacity-50 pointer-events-none'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <input
          ref={inputRef}
          type="file"
          id={inputId}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleChange}
          disabled={loading}
        />

        <div className="flex items-start gap-4 min-w-0">
          <div className={cn('p-4 rounded-lg shrink-0', iconBgColor)}>
            <Icon className={cn('h-8 w-8', iconColor)} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 mb-4">{description}</p>

            {selectedFile ? (
              <div className="flex items-center gap-3 bg-white border border-green-200 rounded-lg px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFile();
                  }}
                  disabled={loading}
                  className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Upload className="h-4 w-4" />
                <span>Arraste ou clique para selecionar</span>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" />
              <p className="text-sm font-medium text-gray-600">Processando...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, loading = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<ExcelTemplate | null>(null);

  const handleFileSelect = (file: File, template: ExcelTemplate) => {
    setSelectedFile(file);
    setActiveTemplate(template);
    onFileSelect(file, template);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setActiveTemplate(null);
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Importar Planilha</h2>
        <p className="text-gray-500">Selecione o tipo de relatório que deseja importar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UploadCard
          title="Estoque Disponível"
          description="Planilha com colunas: Código Material, Nome Material, Total - Disponível"
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          template="disponivel"
          selectedFile={activeTemplate === 'disponivel' ? selectedFile : null}
          loading={loading && activeTemplate === 'disponivel'}
          onFileSelect={handleFileSelect}
          onClearFile={clearFile}
          inputId="file-upload-disponivel"
        />

        <UploadCard
          title="Estoque com Endereço"
          description="Planilha com colunas de localização: Estação, Rack, Linha Prod, Coluna Prod"
          icon={MapPin}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          template="legacy"
          selectedFile={activeTemplate === 'legacy' ? selectedFile : null}
          loading={loading && activeTemplate === 'legacy'}
          onFileSelect={handleFileSelect}
          onClearFile={clearFile}
          inputId="file-upload-legacy"
        />

        <UploadCard
          title="Análise de Setores"
          description="Analisa estoque por setor: Captação (Estoque) e Salão de Vendas (13706/13707)"
          icon={Building2}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          template="setores"
          selectedFile={activeTemplate === 'setores' ? selectedFile : null}
          loading={loading && activeTemplate === 'setores'}
          onFileSelect={handleFileSelect}
          onClearFile={clearFile}
          inputId="file-upload-setores"
        />

        <UploadCard
          title="Tempo de Vida de Pedidos"
          description="Analisa tempo entre aprovação e faturamento (regra de 24h úteis)"
          icon={Clock}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          template="pedidos"
          selectedFile={activeTemplate === 'pedidos' ? selectedFile : null}
          loading={loading && activeTemplate === 'pedidos'}
          onFileSelect={handleFileSelect}
          onClearFile={clearFile}
          inputId="file-upload-pedidos"
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        Formatos suportados: .xlsx, .xls
      </p>
    </div>
  );
};

export default FileUpload;
