import React from 'react';
import { Wine, RefreshCw, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: Date | null;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, isLoading, lastUpdated }) => {
  const { signOut, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-2xl border-b border-blue-700/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        
        {/* Mobile Layout (< md) */}
        <div className="md:hidden">
          {/* Top row - Logo + User actions */}
          <div className="flex items-center justify-between h-16">
            {/* Compact Logo */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-lg flex items-center justify-center">
                  <Wine className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">StockFlow</h1>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-all duration-200"
                title={isLoading ? 'Actualizando...' : 'Actualizar'}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200"
                title="Cerrar Sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom row - User info + Last updated */}
          <div className="pb-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 bg-blue-700/30 rounded-md px-2 py-1">
              <User className="h-3 w-3 text-blue-200" />
              <span className="text-blue-100 font-medium truncate max-w-[120px]">
                {userProfile?.full_name || userProfile?.email || 'Usuario'}
              </span>
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                {userProfile?.role || 'op'}
              </span>
            </div>
            
            {lastUpdated && (
              <div className="text-right">
                <p className="text-blue-300 text-xs">Actualizado</p>
                <p className="text-white text-xs font-medium">
                  {formatLastUpdated(lastUpdated).split(' ')[1]}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tablet & Desktop Layout (>= md) */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Logo and title */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg flex items-center justify-center transform rotate-12">
                <Wine className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">StockFlow</h1>
              <p className="text-blue-200 text-sm font-medium">
                Gestión de Inventario - Tiempo Real
              </p>
            </div>
          </div>

          {/* Status and refresh */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 order-3 sm:order-1">
              <div className="flex items-center space-x-2 bg-blue-700/50 rounded-lg px-3 py-2">
                <User className="h-4 w-4 text-blue-200" />
                <span className="text-sm text-white font-medium">
                  {userProfile?.full_name || userProfile?.email || 'Usuario'}
                </span>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  {userProfile?.role || 'operador'}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-sm"
                title="Cerrar Sesión"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium hidden lg:inline">Salir</span>
              </button>
            </div>

            {lastUpdated && (
              <div className="text-right order-2 sm:order-2">
                <p className="text-xs text-blue-300 font-medium">Última actualización</p>
                <p className="text-xs sm:text-sm text-white font-semibold">
                  {formatLastUpdated(lastUpdated)}
                </p>
              </div>
            )}
            
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg text-sm order-1 sm:order-3"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="font-medium hidden sm:inline">
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;