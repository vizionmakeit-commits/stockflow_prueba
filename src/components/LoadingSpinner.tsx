import React from 'react';
import { RotateCcw, Wine } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-8">
          {/* Spinning outer ring */}
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          
          {/* Wine glass icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Wine className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="text-white">
          <h2 className="text-2xl font-bold mb-2">Cargando Inventario</h2>
          <p className="text-blue-200 animate-pulse">
            Actualizando datos desde Google Sheets...
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center mt-6 space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;