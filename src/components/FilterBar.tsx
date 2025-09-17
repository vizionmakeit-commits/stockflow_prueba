import React from 'react';
import { Search, Filter, X, BarChart } from 'lucide-react';
import { FilterState, InventoryItem } from '../types/inventory';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  destilados: string[];
  productos: string[];
  items: InventoryItem[];
  totalItems: number;
  filteredItems: number;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  destilados,
  productos,
  items,
  totalItems,
  filteredItems,
}) => {
  const hasActiveFilters = filters.destilado || filters.producto || filters.ubicacion;

  // Obtener productos disponibles basados en el destilado seleccionado (igual que en UpdateUnidadesModule)
  const productosDisponibles = filters.destilado 
    ? [...new Set(items
        .filter(item => item.destilado === filters.destilado)
        .map(item => item.producto)
      )].sort()
    : productos;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Búsqueda</h3>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                Activos
              </span>
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <BarChart className="h-4 w-4 mr-2" />
            <span className="font-medium">{filteredItems}</span>
            <span className="mx-1">/</span>
            <span>{totalItems} productos</span>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Filtro por Destilado */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Destilado
            </label>
            <select
              value={filters.destilado}
              onChange={(e) => {
                // Al cambiar destilado, limpiar el filtro de producto para evitar inconsistencias
                onFilterChange({ 
                  ...filters, 
                  destilado: e.target.value,
                  producto: '' // Reset producto when destilado changes
                });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="">Todos los destilados</option>
              {destilados.map((destilado) => (
                <option key={destilado} value={destilado}>
                  {destilado}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Producto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Producto Específico
            </label>
            <select
              value={filters.producto}
              onChange={(e) => onFilterChange({ ...filters, producto: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="">
                {filters.destilado ? `Todos los productos de ${filters.destilado}` : 'Todos los productos'}
              </option>
              {productosDisponibles.map((producto) => (
                <option key={producto} value={producto}>
                  {producto}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Ubicación */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Ubicación del Stock
            </label>
            <select
              value={filters.ubicacion}
              onChange={(e) => onFilterChange({ ...filters, ubicacion: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-400"
            >
              <option value="">Todas las ubicaciones</option>
              <option value="barra">Solo Barra (stock {'>'} 0)</option>
              <option value="bodega">Solo Bodega (stock {'>'} 0)</option>
              <option value="stock-critico">Stock Crítico (≤ mínimo)</option>
              <option value="stock-bajo">Stock Bajo ({'<'} óptimo)</option>
              <option value="stock-ok">Stock OK (≥ óptimo)</option>
            </select>
          </div>

          {/* Botón Limpiar Filtros */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 opacity-0">
              Acciones
            </label>
            <button
              onClick={() => onFilterChange({ destilado: '', producto: '', ubicacion: '' })}
              disabled={!hasActiveFilters}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm"
            >
              <X className="h-4 w-4" />
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 mr-2">Filtros activos:</span>
              {filters.destilado && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  Destilado: {filters.destilado}
                  <button
                    onClick={() => onFilterChange({ ...filters, destilado: '' })}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.producto && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  Producto: {filters.producto}
                  <button
                    onClick={() => onFilterChange({ ...filters, producto: '' })}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.ubicacion && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  Ubicación: {
                    filters.ubicacion === 'stock-critico' ? 'Stock Crítico' :
                    filters.ubicacion === 'stock-bajo' ? 'Stock Bajo' :
                    filters.ubicacion === 'stock-ok' ? 'Stock OK' :
                    filters.ubicacion
                  }
                  <button
                    onClick={() => onFilterChange({ ...filters, ubicacion: '' })}
                    className="hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;