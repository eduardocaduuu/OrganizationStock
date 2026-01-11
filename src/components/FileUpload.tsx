import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from './ui/Button';
import { ExcelTemplate } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File, template: ExcelTemplate) => void;
  loading?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, loading = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [template, setTemplate] = useState<ExcelTemplate>('auto');

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
        setSelectedFile(file);
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
      setSelectedFile(file);
      onFileSelect(file, template);
    }
  }, [onFileSelect, template]);

  const clearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Template selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="template-select" className="text-sm font-medium text-gray-700">
          Formato da planilha:
        </label>
        <select
          id="template-select"
          value={template}
          onChange={(e) => setTemplate(e.target.value as ExcelTemplate)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="auto">Auto (detectar)</option>
          <option value="legacy">Estoque (atual)</option>
          <option value="disponivel">Disponível</option>
        </select>
      </div>

      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-white hover:border-primary-400',
          loading && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleChange}
          disabled={loading}
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
              <FileSpreadsheet className="h-6 w-6 text-primary-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              disabled={loading}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <Upload className="h-10 w-10 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-700">
                  Arraste seu arquivo Excel aqui
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ou clique para selecionar
                </p>
              </div>
              <div className="inline-flex items-center justify-center rounded-md font-medium border transition-colors px-4 py-2 text-sm bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50">
                Selecionar Arquivo
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Formatos suportados: .xlsx, .xls
              </p>
            </div>
          </label>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600" />
              <p className="text-sm font-medium text-gray-600">Processando arquivo...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
