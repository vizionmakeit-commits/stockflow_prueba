import React from 'react';
import { DollarSign, Package, AlertTriangle, TrendingUp, Wine, MapPin } from 'lucide-react';
import { InventoryStats, InventoryViewService } from '../utils/inventoryViewService';
import MetricCard from './MetricCard';

interface StatsOverviewProps {
  inventoryStats: InventoryStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ inventoryStats }) => {
  const {
    totalStock,
    totalValuation,
    locationSummaries,
    productSummaries,
    uniqueLocations
  } = inventoryStats;

  // Producto más valioso
  const mostValuableProduct = productSummaries.reduce((prev, current) => 
    (current.total_valuation > prev.total_valuation) ? current : prev, 
    productSummaries[0]
  );

  // Generar icono dinámico para ubicaciones
  const getLocationIcon = (ubicacion: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'barra': Wine,
      'bodega': Package,
      'terraza': MapPin,
      'cocina': MapPin,
      'almacen': Package
    };
    return iconMap[ubicacion.toLowerCase()] || MapPin;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      {/* Importe Total del Stock - Métrica Principal */}
      <div className="md:col-span-2">
        <MetricCard
          title="IMPORTE TOTAL DEL STOCK"
          value={`$${totalValuation.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
          trend={productSummaries.length > 0 ? `${productSummaries.length} productos activos` : undefined}
        />
      </div>

      {/* Total de Botellas */}
      <MetricCard
        title="Total Botellas"
        value={totalStock.toFixed(1)}
        icon={Wine}
        color="blue"
        trend={`${uniqueLocations.length} ubicaciones`}
      />

      {/* Productos Únicos */}
      <MetricCard
        title="Productos Únicos"
        value={productSummaries.length.toString()}
        icon={Package}
        color="purple"
        trend={`En ${uniqueLocations.length} ubicaciones`}
      />

      {/* Tarjetas dinámicas por ubicación */}
      {locationSummaries.map((location, index) => {
        const LocationIcon = getLocationIcon(location.ubicacion);
        const percentage = totalStock > 0 ? ((location.total_stock / totalStock) * 100).toFixed(1) : '0';
        
        return (
          <MetricCard
            key={location.ubicacion}
            title={`Stock en ${InventoryViewService.formatLocationName(location.ubicacion)}`}
            value={location.total_stock.toString()}
            icon={LocationIcon}
            color={index % 2 === 0 ? "blue" : "purple"}
            trend={`${percentage}% del total`}
          />
        );
      })}

      {/* Producto Más Valioso */}
      {mostValuableProduct && (
        <div className="md:col-span-2">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1">PRODUCTO MÁS VALIOSO</p>
                <p className="text-xl font-bold mb-1">{mostValuableProduct.producto_nombre}</p>
                <p className="text-amber-100 text-sm">{mostValuableProduct.destilado}</p>
                <p className="text-2xl font-bold mt-2">
                  ${mostValuableProduct.total_valuation.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;