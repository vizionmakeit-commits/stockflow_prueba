import React, { useState, useEffect } from 'react';
import { Transaction } from '../utils/transactionService';
import { TransactionService } from '../utils/transactionService';
import { FileText, DollarSign, Package, Zap, X, Calendar, Filter, Wifi, WifiOff, RefreshCw, Send } from 'lucide-react';
import OfflineService from '../utils/offlineService';

// Tipos para filtros
interface FiltrosTransacciones {
  fechaInicio: string;
  fechaFin: string;
  tipoTransaccion: string;
  operacion: string;
  productoNombre: string;
}

// Tipos para ordenamiento
interface OrdenamientoTransacciones {
  columna: string;
  direccion: 'ASC' | 'DESC';
}

// Tipos para estadísticas
interface StatsTransacciones {
  totalTransacciones: number;
  costoTotal: number;
  transaccionesPorTipo: Record<string, number>;
  transaccionesPorOperacion: Record<string, number>;
}

const ControlTransaccionesModule: React.FC = () => {
  // Servicio offline
  const offlineService = OfflineService.getInstance();
  
  // Estados principales
  const [transacciones, setTransacciones] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para conectividad
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<FiltrosTransacciones>({
    fechaInicio: '',
    fechaFin: '',
    tipoTransaccion: '',
    operacion: '',
    productoNombre: ''
  });
  
  // Estados para ordenamiento
  const [ordenamiento, setOrdenamiento] = useState<OrdenamientoTransacciones>({
    columna: 'timestamp',
    direccion: 'DESC'
  });
  
  // Estados para estadísticas
  const [stats, setStats] = useState<StatsTransacciones>({
    totalTransacciones: 0,
    costoTotal: 0,
    transaccionesPorTipo: {},
    transaccionesPorOperacion: {}
  });
  
  // Estados para opciones de filtros (se cargan dinámicamente)
  const [opcionesFiltros, setOpcionesFiltros] = useState({
    tiposTransaccion: [] as string[],
    operaciones: [] as string[],
    productos: [] as string[]
  });

  // FUNCIÓN 1: Cargar transacciones iniciales (últimas 30)
  const cargarTransaccionesIniciales = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando transacciones iniciales...');
      
      // En modo offline, usar transacciones cacheadas
      if (!isOnline) {
        console.log('📦 Offline mode - loading cached transactions');
        const cachedTransactions = localStorage.getItem('stockflow_transactions');
        if (cachedTransactions) {
          const transactions = JSON.parse(cachedTransactions);
          setTransacciones(transactions);
          calcularEstadisticas(transactions);
          extraerOpcionesFiltros(transactions);
          console.log('✅ Cached transactions loaded:', transactions.length, 'registros');
        } else {
          setTransacciones([]);
          console.log('⚠️ No cached transactions available');
        }
        return;
      }

      // Si estamos online, cargar desde Supabase
      const data = await TransactionService.getAllTransactions(30, 0);
      setTransacciones(data);
      
      // Guardar en caché para uso offline
      localStorage.setItem('stockflow_transactions', JSON.stringify(data));
      
      // Calcular estadísticas
      calcularEstadisticas(data);
      
      // Extraer opciones para filtros
      extraerOpcionesFiltros(data);
      
      console.log('✅ Transacciones iniciales cargadas y cacheadas:', data.length, 'registros');
    } catch (err) {
      console.error('❌ Error cargando transacciones iniciales:', err);
      setError('Error al cargar las transacciones');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN 2: Cargar transacciones con filtros
  const cargarTransaccionesFiltradas = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Aplicando filtros:', filtros);
      
      // En modo offline, filtrar las transacciones cacheadas localmente
      if (!isOnline) {
        console.log('📦 Offline mode - filtering cached transactions');
        const cachedTransactions = localStorage.getItem('stockflow_transactions');
        if (cachedTransactions) {
          let transactions = JSON.parse(cachedTransactions);
          
          // Aplicar filtros localmente
          if (filtros.tipoTransaccion) {
            transactions = transactions.filter((t: Transaction) => 
              t.tipo_transaccion === filtros.tipoTransaccion
            );
          }
          
          if (filtros.operacion) {
            transactions = transactions.filter((t: Transaction) => 
              t.operacion === filtros.operacion
            );
          }
          
          if (filtros.productoNombre) {
            transactions = transactions.filter((t: Transaction) => 
              t.producto_nombre.toLowerCase().includes(filtros.productoNombre.toLowerCase())
            );
          }
          
          setTransacciones(transactions);
          calcularEstadisticas(transactions);
          console.log('✅ Cached transactions filtered:', transactions.length, 'registros');
        } else {
          setTransacciones([]);
        }
        return;
      }
      
      // Si estamos online, usar el servicio normal
      const filtrosServicio: any = {};
      
      if (filtros.tipoTransaccion) {
        filtrosServicio.tipo_transaccion = filtros.tipoTransaccion;
      }
      
      if (filtros.operacion) {
        filtrosServicio.operacion = filtros.operacion;
      }
      
      if (filtros.productoNombre) {
        filtrosServicio.producto_nombre = filtros.productoNombre;
      }
      
      if (filtros.fechaInicio) {
        filtrosServicio.date_from = filtros.fechaInicio;
      }
      
      if (filtros.fechaFin) {
        filtrosServicio.date_to = filtros.fechaFin;
      }
      
      // Obtener transacciones filtradas (máximo 100)
      const data = await TransactionService.getAllTransactions(100, 0, filtrosServicio);
      setTransacciones(data);
      
      // Recalcular estadísticas con datos filtrados
      calcularEstadisticas(data);
      
      console.log('✅ Transacciones filtradas cargadas:', data.length, 'registros');
    } catch (err) {
      console.error('❌ Error aplicando filtros:', err);
      setError('Error al aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN 3: Ordenar transacciones
  const ordenarTransacciones = (columna: string) => {
    console.log('📊 Ordenando por columna:', columna);
    
    // Determinar nueva dirección
    const nuevaDireccion = 
      ordenamiento.columna === columna && ordenamiento.direccion === 'ASC' 
        ? 'DESC' 
        : 'ASC';
    
    // Actualizar estado de ordenamiento
    setOrdenamiento({ columna, direccion: nuevaDireccion });
    
    // Ordenar array de transacciones
    const transaccionesOrdenadas = [...transacciones].sort((a, b) => {
      let valorA: any = a[columna as keyof Transaction];
      let valorB: any = b[columna as keyof Transaction];
      
      // Manejar diferentes tipos de datos
      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }
      
      if (typeof valorA === 'number') {
        return nuevaDireccion === 'ASC' ? valorA - valorB : valorB - valorA;
      }
      
      // Para strings y fechas
      if (nuevaDireccion === 'ASC') {
        return valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
      } else {
        return valorA > valorB ? -1 : valorA < valorB ? 1 : 0;
      }
    });
    
    setTransacciones(transaccionesOrdenadas);
    console.log('✅ Transacciones ordenadas por', columna, nuevaDireccion);
  };

  // FUNCIÓN AUXILIAR: Calcular estadísticas
  const calcularEstadisticas = (data: Transaction[]) => {
    const nuevasStats: StatsTransacciones = {
      totalTransacciones: data.length,
      costoTotal: data.reduce((sum, t) => sum + (t.costo_transaccion || 0), 0),
      transaccionesPorTipo: {},
      transaccionesPorOperacion: {}
    };
    
    // Contar por tipo de transacción
    data.forEach(t => {
      nuevasStats.transaccionesPorTipo[t.tipo_transaccion] = 
        (nuevasStats.transaccionesPorTipo[t.tipo_transaccion] || 0) + 1;
    });
    
    // Contar por operación
    data.forEach(t => {
      nuevasStats.transaccionesPorOperacion[t.operacion] = 
        (nuevasStats.transaccionesPorOperacion[t.operacion] || 0) + 1;
    });
    
    setStats(nuevasStats);
    console.log('📈 Estadísticas calculadas:', nuevasStats);
  };

  // FUNCIÓN AUXILIAR: Extraer opciones para filtros
  const extraerOpcionesFiltros = (data: Transaction[]) => {
    const tiposTransaccion = [...new Set(data.map(t => t.tipo_transaccion))].sort();
    const operaciones = [...new Set(data.map(t => t.operacion))].sort();
    const productos = [...new Set(data.map(t => t.producto_nombre))].sort();
    
    setOpcionesFiltros({
      tiposTransaccion,
      operaciones,
      productos
    });
    
    console.log('🎯 Opciones de filtros extraídas:', {
      tipos: tiposTransaccion.length,
      operaciones: operaciones.length,
      productos: productos.length
    });
  };

  // FUNCIÓN: Actualizar filtros
  const actualizarFiltros = (nuevosFiltros: Partial<FiltrosTransacciones>) => {
    const filtrosActualizados = { ...filtros, ...nuevosFiltros };
    setFiltros(filtrosActualizados);
    console.log('🔧 Filtros actualizados:', filtrosActualizados);
  };

  // FUNCIÓN: Limpiar filtros
  const limpiarFiltros = () => {
    const filtrosVacios: FiltrosTransacciones = {
      fechaInicio: '',
      fechaFin: '',
      tipoTransaccion: '',
      operacion: '',
      productoNombre: ''
    };
    setFiltros(filtrosVacios);
    console.log('🧹 Filtros limpiados');
  };

  // useEffect: Cargar datos iniciales al montar componente
  useEffect(() => {
    console.log('🚀 ControlTransaccionesModule montado, cargando datos iniciales...');
    cargarTransaccionesIniciales();
    
    // Actualizar contador de transacciones pendientes
    setPendingTransactions(offlineService.getPendingTransactionCount());
  }, []);

  // useEffect: Manejar cambios de conectividad
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Connection restored, syncing...');
      setIsOnline(true);
      
      try {
        const { synced, failed } = await offlineService.syncPendingTransactions();
        setPendingTransactions(offlineService.getPendingTransactionCount());
        
        if (synced > 0) {
          console.log(`✅ Sincronizadas ${synced} transacciones`);
          // Recargar transacciones después de sincronizar
          await cargarTransaccionesIniciales();
        }
        
        if (failed > 0) {
          console.log(`⚠️ ${failed} transacciones fallaron`);
        }
      } catch (error) {
        console.error('Error during auto-sync:', error);
      }
    };

    const handleOffline = () => {
      console.log('📴 Connection lost, switching to offline mode');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // useEffect: Aplicar filtros cuando cambien
  useEffect(() => {
    // Solo aplicar filtros si hay algún filtro activo
    const hayFiltrosActivos = Object.values(filtros).some(valor => valor !== '');
    
    if (hayFiltrosActivos) {
      console.log('🔄 Filtros cambiaron, aplicando filtros...');
      cargarTransaccionesFiltradas();
    }
  }, [filtros]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Control de Transacciones</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Lógica de datos implementada - {transacciones.length} transacciones cargadas
                </p>
              </div>
            </div>
            
            {/* Indicadores de conectividad */}
            <div className="flex items-center gap-4">
              {/* Estado de conectividad */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>
              
              {/* Botón de actualizar datos */}
              <button
                onClick={cargarTransaccionesIniciales}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar Datos
              </button>
              
              {/* Botón de sincronización manual */}
              {pendingTransactions > 0 && isOnline && (
                <button
                  onClick={async () => {
                    try {
                      const { synced, failed } = await offlineService.syncPendingTransactions();
                      setPendingTransactions(offlineService.getPendingTransactionCount());
                      
                      if (synced > 0) {
                        console.log(`✅ Sincronizadas ${synced} transacciones`);
                        await cargarTransaccionesIniciales();
                      }
                    } catch (error) {
                      console.error('Error syncing:', error);
                    }
                  }}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                >
                  <Send className="h-4 w-4" />
                  Sincronizar ({pendingTransactions})
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estadísticas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Transacciones</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalTransacciones}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Costo Total</p>
                  <p className="text-2xl font-bold text-green-900">${stats.costoTotal.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Tipos de Transacción</p>
                  <p className="text-2xl font-bold text-purple-900">{Object.keys(stats.transaccionesPorTipo).length}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Operaciones</p>
                  <p className="text-2xl font-bold text-orange-900">{Object.keys(stats.transaccionesPorOperacion).length}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filtros de Búsqueda</h3>
              {(filtros.fechaInicio || filtros.fechaFin || filtros.tipoTransaccion || filtros.operacion) && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  Activos
                </span>
              )}
            </div>
            
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Fecha Inicio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => actualizarFiltros({ fechaInicio: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => actualizarFiltros({ fechaFin: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Tipo de Transacción */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Transacción
              </label>
              <select
                value={filtros.tipoTransaccion}
                onChange={(e) => actualizarFiltros({ tipoTransaccion: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todos los tipos</option>
                {opcionesFiltros.tiposTransaccion.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Operación */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Operación
              </label>
              <select
                value={filtros.operacion}
                onChange={(e) => actualizarFiltros({ operacion: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Todas las operaciones</option>
                {opcionesFiltros.operaciones.map((operacion) => (
                  <option key={operacion} value={operacion}>
                    {operacion.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Aplicar Filtros */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 opacity-0">
                Acciones
              </label>
              <button
                onClick={cargarTransaccionesFiltradas}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm"
              >
                <Filter className="h-4 w-4" />
                {loading ? 'Filtrando...' : 'Aplicar'}
              </button>
            </div>
          </div>

          {/* Filtros Activos */}
          {(filtros.fechaInicio || filtros.fechaFin || filtros.tipoTransaccion || filtros.operacion) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 mr-2">Filtros activos:</span>
                
                {filtros.fechaInicio && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    Desde: {filtros.fechaInicio}
                    <button
                      onClick={() => actualizarFiltros({ fechaInicio: '' })}
                      className="hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filtros.fechaFin && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    Hasta: {filtros.fechaFin}
                    <button
                      onClick={() => actualizarFiltros({ fechaFin: '' })}
                      className="hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filtros.tipoTransaccion && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    Tipo: {filtros.tipoTransaccion}
                    <button
                      onClick={() => actualizarFiltros({ tipoTransaccion: '' })}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filtros.operacion && (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    Op: {filtros.operacion.replace('_', ' ').toUpperCase()}
                    <button
                      onClick={() => actualizarFiltros({ operacion: '' })}
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
      
      {/* Tabla de Transacciones */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Transacciones</h3>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {transacciones.length} registros
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">Cargando transacciones...</span>
            </div>
          </div>
        ) : transacciones.length === 0 ? (
          <div className="text-center py-16 bg-gray-50">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron transacciones</h3>
            <p className="text-gray-400 text-lg">Ajusta los filtros para ver más resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => ordenarTransacciones('id_transaccion')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      ID
                      {ordenamiento.columna === 'id_transaccion' && (
                        <span className="text-blue-600">
                          {ordenamiento.direccion === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => ordenarTransacciones('timestamp')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Fecha
                      {ordenamiento.columna === 'timestamp' && (
                        <span className="text-blue-600">
                          {ordenamiento.direccion === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => ordenarTransacciones('tipo_transaccion')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Tipo
                      {ordenamiento.columna === 'tipo_transaccion' && (
                        <span className="text-blue-600">
                          {ordenamiento.direccion === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Producto
                  </th>
                  <th 
                    onClick={() => ordenarTransacciones('operacion')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Operación
                      {ordenamiento.columna === 'operacion' && (
                        <span className="text-blue-600">
                          {ordenamiento.direccion === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Movimiento
                  </th>
                  <th 
                    onClick={() => ordenarTransacciones('costo_transaccion')}
                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Costo
                      {ordenamiento.columna === 'costo_transaccion' && (
                        <span className="text-blue-600">
                          {ordenamiento.direccion === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transacciones.map((transaccion, index) => {
                  const fecha = new Date(transaccion.timestamp);
                  const fechaFormateada = fecha.toLocaleDateString('es-ES');
                  const horaFormateada = fecha.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  return (
                    <tr 
                      key={`${transaccion.id_transaccion}-${index}`}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-blue-600">
                          #{transaccion.id_transaccion}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{fechaFormateada}</div>
                          <div className="text-xs text-gray-500">{horaFormateada}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1.5 text-xs font-bold rounded-full ${
                          transaccion.tipo_transaccion === 'Update_Unidades' ? 'bg-blue-100 text-blue-800' :
                          transaccion.tipo_transaccion === 'Update_Recetas' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaccion.tipo_transaccion}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaccion.producto_nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaccion.producto_destilado}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1.5 text-xs font-bold rounded-full ${
                          transaccion.operacion === 'entrada_stock' ? 'bg-green-100 text-green-800' :
                          transaccion.operacion === 'salida_stock' ? 'bg-red-100 text-red-800' :
                          transaccion.operacion === 'transferencia' ? 'bg-yellow-100 text-yellow-800' :
                          transaccion.operacion === 'ajuste_inventario' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaccion.operacion.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">
                          {transaccion.movimiento_cantidad} {transaccion.movimiento_unidad}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaccion.origen_movimiento && (
                            <span className="text-orange-600 font-medium">
                              {transaccion.origen_movimiento} →
                            </span>
                          )}
                          {transaccion.destino_movimiento && (
                            <span className="text-green-600 font-medium ml-1">
                              {transaccion.destino_movimiento}
                            </span>
                          )}
                          {!transaccion.origen_movimiento && transaccion.destino_movimiento && (
                            <span className="text-green-600 font-medium">
                              → {transaccion.destino_movimiento}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">
                          ${transaccion.costo_transaccion.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlTransaccionesModule;