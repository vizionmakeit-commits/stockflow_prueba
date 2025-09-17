import React from 'react';
import { InventoryItem } from '../types/inventory';
import { AlertTriangle, Package, Store, Warehouse, Wine, Zap, MapPin } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items }) => {
  const getStockStatus = (stock: number, stockMinimo: number, stockOptimo: number) => {
    if (stock <= stockMinimo) return 'critical';
    if (stock < stockOptimo) return 'low';
    return 'ok';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800 border border-red-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ok': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getDestiladoIcon = (destilado: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Whisky': <Wine className="h-4 w-4" />,
      'Ron': <Wine className="h-4 w-4" />,
      'Vodka': <Zap className="h-4 w-4" />,
      'Tequila': <Wine className="h-4 w-4" />,
      'Gin': <Wine className="h-4 w-4" />,
      'Brandy': <Wine className="h-4 w-4" />
    };
    return iconMap[destilado] || <Package className="h-4 w-4" />;
  };

  const getDestiladoColor = (destilado: string) => {
    const colorMap: { [key: string]: string } = {
      'Whisky': 'from-amber-500 to-amber-600',
      'Ron': 'from-orange-500 to-orange-600',
      'Vodka': 'from-blue-500 to-blue-600',
      'Tequila': 'from-green-500 to-green-600',
      'Gin': 'from-teal-500 to-teal-600',
      'Brandy': 'from-red-500 to-red-600'
    };
    return colorMap[destilado] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Inventario Detallado</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
            {items.length} productos
          </span>
        </div>
      </div>
      
      {/* Mobile Card View (< lg) */}
      <div className="lg:hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No se encontraron productos</h3>
            <p className="text-gray-400 text-sm">Ajusta los filtros para ver más resultados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const totalStatus = getStockStatus(item.stock_total, item.stock_minimo, item.stock_optimo);
              const barraStatus = getStockStatus(item.stock_barra, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
              const bodegaStatus = getStockStatus(item.stock_bodega, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
              const terrazaStatus = getStockStatus(item.stock_terraza, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
              
              return (
                <div key={`${item.destilado}-${item.producto}-${index}`} className="p-4 hover:bg-gray-50">
                  {/* Header - Product Info */}
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${getDestiladoColor(item.destilado)} flex items-center justify-center shadow-lg`}>
                        <div className="text-white">
                          {getDestiladoIcon(item.destilado)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {item.producto}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {item.destilado}
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {totalStatus === 'critical' && (
                        <div className="flex items-center text-red-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="text-xs font-bold bg-red-100 px-2 py-1 rounded-full">
                            CRÍTICO
                          </span>
                        </div>
                      )}
                      {totalStatus === 'low' && (
                        <div className="flex items-center text-yellow-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="text-xs font-bold bg-yellow-100 px-2 py-1 rounded-full">
                            BAJO
                          </span>
                        </div>
                      )}
                      {totalStatus === 'ok' && (
                        <div className="flex items-center text-green-600">
                          <Package className="h-3 w-3 mr-1" />
                          <span className="text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                            OK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center space-x-1 mb-1">
                        <Store className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">Barra</span>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(barraStatus)}`}>
                        {item.stock_barra}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center space-x-1 mb-1">
                        <Warehouse className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">Bodega</span>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(bodegaStatus)}`}>
                        {item.stock_bodega}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center space-x-1 mb-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">Terraza</span>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(terrazaStatus)}`}>
                        {item.stock_terraza}
                      </span>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">Total</div>
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(totalStatus)}`}>
                        {item.stock_total}
                      </span>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500">Costo Unit.</div>
                      <div className="text-sm font-bold text-gray-900">${item.costo_unitario.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Valoración</div>
                      <div className="text-sm font-bold text-green-600">${item.valoracion.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Desktop Table View (>= lg) */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Stock Barra
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Stock Bodega
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Stock Terraza
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Stock Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Costo Unitario
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Valoración Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => {
                const totalStatus = getStockStatus(item.stock_total, item.stock_minimo, item.stock_optimo);
                const barraStatus = getStockStatus(item.stock_barra, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
                const bodegaStatus = getStockStatus(item.stock_bodega, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
                const terrazaStatus = getStockStatus(item.stock_terraza, Math.floor(item.stock_minimo / 2), Math.floor(item.stock_optimo / 2));
                
                return (
                  <tr 
                    key={`${item.destilado}-${item.producto}-${index}`} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${getDestiladoColor(item.destilado)} flex items-center justify-center shadow-lg`}>
                            <div className="text-white">
                              {getDestiladoIcon(item.destilado)}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.producto}
                          </div>
                          <div className="text-sm text-gray-500 font-medium">
                            {item.destilado}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Store className="h-4 w-4 text-gray-400" />
                        <span className={`px-2.5 py-1.5 text-xs font-bold rounded-full ${getStatusColor(barraStatus)}`}>
                          {item.stock_barra}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Warehouse className="h-4 w-4 text-gray-400" />
                        <span className={`px-2.5 py-1.5 text-xs font-bold rounded-full ${getStatusColor(bodegaStatus)}`}>
                          {item.stock_bodega}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className={`px-2.5 py-1.5 text-xs font-bold rounded-full ${getStatusColor(terrazaStatus)}`}>
                          {item.stock_terraza}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-2 text-sm font-bold rounded-full ${getStatusColor(totalStatus)}`}>
                        {item.stock_total} unidades
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${item.costo_unitario.toFixed(2)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-green-600">
                        ${item.valoracion.toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {totalStatus === 'critical' && (
                        <div className="flex items-center text-red-600">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          <span className="text-xs font-bold bg-red-100 px-2 py-1 rounded-full">
                            STOCK CRÍTICO
                          </span>
                        </div>
                      )}
                      {totalStatus === 'low' && (
                        <div className="flex items-center text-yellow-600">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          <span className="text-xs font-bold bg-yellow-100 px-2 py-1 rounded-full">
                            STOCK BAJO
                          </span>
                        </div>
                      )}
                      {totalStatus === 'ok' && (
                        <div className="flex items-center text-green-600">
                          <Package className="h-4 w-4 mr-2" />
                          <span className="text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                            STOCK OK
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {items.length === 0 && (
          <div className="text-center py-16 bg-gray-50">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron productos</h3>
            <p className="text-gray-400 text-lg">Ajusta los filtros para ver más resultados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;