import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import { FilterState } from './types/inventory';
import { InventoryViewService, InventoryStats } from './utils/inventoryViewService';
import { StockAlertService } from './utils/alertService';
import { ScheduledReportService } from './utils/scheduledReportService';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import InventoryTable from './components/InventoryTable';
import AlertSettings from './components/AlertSettings';
import UpdateUnidadesModule from './components/UpdateUnidadesModule';
import UpdateRecetasModule from './components/UpdateRecetasModule';
import ControlTransaccionesModule from './components/ControlTransaccionesModule';
import AdminModule from './components/AdminModule';
import { Package } from 'lucide-react';

function App() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalStock: 0,
    totalValuation: 0,
    locationSummaries: [],
    productSummaries: [],
    uniqueLocations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('HOME');
  const [filters, setFilters] = useState<FilterState>({
    destilado: '',
    producto: '',
    ubicacion: ''
  });

  // Alert service instance
  const [alertService] = useState(() => new StockAlertService());
  
  // Scheduled report service instance
  const [reportService] = useState(() => ScheduledReportService.getInstance());

  // Función para cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos de inventario desde vista_inventario...');
      const result = await InventoryViewService.getInventoryData();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al cargar inventario');
      }
      
      setInventoryStats(result.data!);
      setLastUpdated(new Date());
      
      // Verificar alertas después de cargar datos
      // Convertir productSummaries a formato InventoryItem para compatibilidad con alertas
      const inventoryItems = result.data!.productSummaries.map(product => ({
        destilado: product.destilado,
        producto: product.producto_nombre,
        stock_barra: product.locations.find(loc => loc.ubicacion === 'barra')?.cantidad_unidades || 0,
        stock_bodega: product.locations.find(loc => loc.ubicacion === 'bodega')?.cantidad_unidades || 0,
        stock_total: product.total_stock,
        costo_unitario: product.total_valuation / product.total_stock || 0,
        valoracion: product.total_valuation,
        stock_minimo: 3, // Valor por defecto
        stock_optimo: 8  // Valor por defecto
      }));
      
      await alertService.checkAndSendAlerts(inventoryItems);
      
      console.log('✅ Datos de inventario cargados exitosamente:', {
        totalProducts: result.data!.productSummaries.length,
        totalLocations: result.data!.uniqueLocations.length,
        totalStock: result.data!.totalStock,
        totalValuation: result.data!.totalValuation
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos del inventario';
      setError(errorMessage);
      console.error('❌ Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular productos críticos basado en los nuevos datos
  const criticalItemsCount = inventoryStats.productSummaries.filter(product => 
    product.total_stock <= 3 // Usando valor por defecto de stock mínimo
  ).length;

  // Cargar datos al montar el componente
  useEffect(() => {
    if (!isAuthenticated) return;
    
    loadData();
    
    // REMOVED: Scheduled report service initialization was causing refresh loops
    // Reports will be handled manually when needed
  }, [isAuthenticated]);

  // Obtener listas únicas para filtros basado en los nuevos datos
  const destilados = useMemo(() => {
    const unique = [...new Set(inventoryStats.productSummaries.map(item => item.destilado))];
    return unique.sort();
  }, [inventoryStats.productSummaries]);

  const productos = useMemo(() => {
    const unique = [...new Set(inventoryStats.productSummaries.map(item => item.producto_nombre))];
    return unique.sort();
  }, [inventoryStats.productSummaries]);

  // Aplicar filtros
  const filteredItems = useMemo(() => {
    return inventoryStats.productSummaries.filter(product => {
      // Filtro por destilado
      if (filters.destilado && product.destilado !== filters.destilado) {
        return false;
      }

      // Filtro por producto
      if (filters.producto && product.producto_nombre !== filters.producto) {
        return false;
      }

      // Filtro por ubicación
      if (filters.ubicacion) {
        const barraStock = product.locations.find(loc => loc.ubicacion === 'barra')?.cantidad_unidades || 0;
        const bodegaStock = product.locations.find(loc => loc.ubicacion === 'bodega')?.cantidad_unidades || 0;
        
        switch (filters.ubicacion) {
          case 'barra':
            return barraStock > 0;
          case 'bodega':
            return bodegaStock > 0;
          case 'stock-critico':
            return product.total_stock <= 3; // Valor por defecto
          case 'stock-bajo':
            return product.total_stock < 8 && product.total_stock > 3; // Valores por defecto
          case 'stock-ok':
            return product.total_stock >= 8; // Valor por defecto
          default:
            break;
        }
      }

      return true;
    });
  }, [inventoryStats.productSummaries, filters]);

  // Mostrar loading durante verificación de autenticación
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Mostrar página de login si no está autenticado
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Mostrar spinner de carga
  if (loading && inventoryStats.productSummaries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Cargando Inventario</h2>
            <p className="text-blue-200 animate-pulse">
              Conectando con vista_inventario...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <Header 
        onRefresh={loadData}
        isLoading={loading}
        lastUpdated={lastUpdated}
      />

      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HOME Tab Content */}
        {activeTab === 'HOME' && (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">
                      {error}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Se están mostrando datos de ejemplo. Verifique la conexión a Google Sheets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Overview */}
            <StatsOverview inventoryStats={{
              ...inventoryStats,
              productSummaries: filteredItems
            }} />

            {/* Filter Bar */}
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              destilados={destilados}
              productos={productos}
              items={inventoryStats.productSummaries.map(product => ({
                destilado: product.destilado,
                producto: product.producto_nombre,
                stock_barra: product.locations.find(loc => loc.ubicacion === 'barra')?.cantidad_unidades || 0,
                stock_bodega: product.locations.find(loc => loc.ubicacion === 'bodega')?.cantidad_unidades || 0,
                stock_total: product.total_stock,
                costo_unitario: product.total_valuation / product.total_stock || 0,
                valoracion: product.total_valuation,
                stock_minimo: 3,
                stock_optimo: 8
              }))}
              totalItems={inventoryStats.productSummaries.length}
              filteredItems={filteredItems.length}
            />

            {/* Inventory Table */}
            <InventoryTable items={filteredItems.map(product => ({
              destilado: product.destilado,
              producto: product.producto_nombre,
              stock_barra: product.locations.find(loc => loc.ubicacion === 'barra')?.cantidad_unidades || 0,
              stock_bodega: product.locations.find(loc => loc.ubicacion === 'bodega')?.cantidad_unidades || 0,
              stock_terraza: product.locations.find(loc => loc.ubicacion === 'terraza')?.cantidad_unidades || 0,
              stock_terraza: product.locations.find(loc => loc.ubicacion === 'terraza')?.cantidad_unidades || 0,
              stock_total: product.total_stock,
              costo_unitario: product.total_valuation / product.total_stock || 0,
              valoracion: product.total_valuation,
              stock_minimo: 3,
              stock_optimo: 8
            }))} />

            {/* Footer Info */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                StockFlow • Conectado a Supabase vista_inventario • Actualización en tiempo real
              </p>
              {lastUpdated && (
                <p className="text-xs text-gray-400 mt-1">
                  Datos actualizados: {lastUpdated.toLocaleString('es-ES')}
                </p>
              )}
            </div>
          </>
        )}

        {/* UPDATE UNIDADES Tab Content */}
        {activeTab === 'UPDATE_UNIDADES' && <UpdateUnidadesModule />}

        {/* UPDATE RECETAS Tab Content */}
        {activeTab === 'UPDATE_RECETAS' && <UpdateRecetasModule />}

        {/* CONTROL TRANSACCIONES Tab Content */}
        {activeTab === 'CONTROL_TRANSACCIONES' && <ControlTransaccionesModule />}

        {/* ADMINISTRACION Tab Content */}
        {activeTab === 'ADMINISTRACION' && <AdminModule criticalItemsCount={criticalItemsCount} />}
      </main>
    </div>
  );
}

export default App;