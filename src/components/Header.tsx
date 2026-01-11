import React from 'react';
import { Package } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-primary-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-700 p-2 rounded-lg">
            <Package className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sistema de Controle de Estoque</h1>
            <p className="text-primary-200 text-sm">Análise e Gestão Inteligente</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
