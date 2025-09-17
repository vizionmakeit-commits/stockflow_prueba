import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  Send,
  Eye,
  Wine,
  MapPin,
  Zap,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// Interfaces para datos de Supabase
interface ProductoSupabase {
  id: string;
  nombre: string;
  destilado: string | null;
  costo_unitario: number;
  capacidad_ml_por_unidad: number;
  seguimiento_stock: boolean;
}

interface InventarioSupabase {
  producto_id: string;
  producto_nombre: string;
  destilado: string;
  ubicacion: string;
  cantidad_unidades: number;
  costo_unitario: number;
  valoracion_total: number;
}

interface TransactionPayload {
  tipo_transaccion: string;
  timestamp: string;
  id_usuario: string;
  origen: {
    tipo: string;
    nombre: string;
  };
  producto: {
    nombre: string;
    destilado: string;
  };
  movimiento: {
    cantidad_unidades: number;
    operacion: string;
    movimiento_unidad: string;
    origen: string | null;
    destino: string;
  };
  valores: {
    costo_transaccion: number;
  };
}

// Toast Notification Component
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`}>
      <div className="h-5 w-5 flex-shrink-0">
        {type === 'success' ? '✓' : '✗'}
      </div>
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        ×
      </button>
    </div>
  );
};

const UpdateUnidadesModule: React.FC = () => {
  // Estados para productos e inventario
  const [productos, setProductos] = useState<ProductoSupabase[]>([]);
  const [inventario, setInventario] = useState<InventarioSupabase[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Estados para el formulario
  const [selectedDestilado, setSelectedDestilado] = useState('');
  const [selectedProducto, setSelectedProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [operacion, setOperacion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado para toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    console.log('🚀 UpdateUnidadesModule mounted, loading initial data...');
    loadData();
  }, []);

  const loadData = async () => {
    console.log('🔄 Starting loadData from Supabase...');
    setLoadingProducts(true);
    try {
      // Cargar productos desde Supabase
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('id, nombre, destilado, costo_unitario, capacidad_ml_por_unidad, seguimiento_stock')
        .eq('seguimiento_stock', true)
        .order('destilado', { ascending: true })
        .order('nombre', { ascending: true });

      if (productosError) {
        throw new Error(`Error cargando productos: ${productosError.message}`);
      }

      // Cargar inventario desde vista_inventario
      const { data: inventarioData, error: inventarioError } = await supabase
        .from('vista_inventario')
        .select('producto_id, producto_nombre, destilado, ubicacion, cantidad_unidades, costo_unitario, valoracion_total');

      if (inventarioError) {
        throw new Error(`Error cargando inventario: ${inventarioError.message}`);
      }

      setProductos(productosData || []);
      setInventario(inventarioData || []);
      
      console.log('✅ Data loaded successfully:', {
        productos: productosData?.length || 0,
        inventario: inventarioData?.length || 0
      });
    } catch (error) {
      console.error('❌ Error loading data:', error);
      showToast('Error al cargar datos desde Supabase', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Obtener listas únicas para filtros
  const destilados = [...new Set(productos.map(p => p.destilado).filter(Boolean))].sort();
  const productosDisponibles = selectedDestilado 
    ? productos.filter(p => p.destilado === selectedDestilado).map(p => p.nombre).sort()
    : [];

  // Obtener producto seleccionado del inventario para cálculos
  const selectedInventoryItem = inventario.find(item => 
    item.destilado === selectedDestilado && item.producto_nombre === selectedProducto
  );

  // Calcular costo total del movimiento
  const costoTotalMovimiento = selectedInventoryItem && cantidad 
    ? selectedInventoryItem.costo_unitario * parseFloat(cantidad)
    : 0;

  // Lógica condicional para campos según operación
  const isOrigenDisabled = operacion === 'Entrada Stock' || operacion === 'Salida Stock' || operacion === 'Ajuste Inventario';
  const isDestinoDisabled = operacion === 'Salida Stock';
  
  // Auto-fijar destino para "Salida Stock"
  React.useEffect(() => {
    if (operacion === 'Salida Stock') {
      setDestino('barra');
    }
  }, [operacion]);

  // Validación para Transferencia
  const isTransferenciaValid = operacion !== 'Transferencia' || (origen !== destino && origen && destino);
  const showTransferenciaError = operacion === 'Transferencia' && origen && destino && origen === destino;

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!selectedDestilado || !selectedProducto || !cantidad || !operacion) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    // Validaciones específicas por operación
    if (operacion === 'Transferencia') {
      if (!origen || !destino) {
        showToast('Para transferencias, origen y destino son obligatorios', 'error');
        return;
      }
      if (origen === destino) {
        showToast('El origen y destino no pueden ser iguales en una transferencia', 'error');
        return;
      }
    } else if (operacion === 'Entrada Stock' || operacion === 'Ajuste Inventario') {
      if (!destino) {
        showToast('El destino es obligatorio', 'error');
        return;
      }
    }
    // Para "Salida Stock", destino se fija automáticamente en "barra"

    setIsProcessing(true);
    
    try {
      console.log('🔄 Processing transaction...');
      
      // Obtener ID de usuario actual (simplificado para testing)
      const currentUserId = 'admin_default'; // En producción, obtener del contexto de auth
      
      // Crear payload base para transacción
      const basePayload: TransactionPayload = {
        tipo_transaccion: "Update_Unidades",
        timestamp: new Date().toISOString(),
        id_usuario: currentUserId,
        origen: {
          tipo: "manual",
          nombre: "Update_Unidades"
        },
        producto: {
          nombre: selectedProducto,
          destilado: selectedDestilado
        },
        movimiento: {
          cantidad_unidades: parseFloat(cantidad),
          operacion: operacion === 'Entrada Stock' ? 'entrada_stock' :
                    operacion === 'Salida Stock' ? 'salida_stock' :
                    operacion === 'Transferencia' ? 'transferencia' :
                    operacion === 'Ajuste Inventario' ? 'ajuste_inventario' :
                    operacion.toLowerCase().replace(/\s+/g, '_'),
          movimiento_unidad: 'unidades',
          origen: operacion === 'Transferencia' ? origen : null,
          destino: destino
        },
        valores: {
          costo_transaccion: costoTotalMovimiento,
        }
      };

      // Determinar payload final basado en operación
      let finalPayload: TransactionPayload | TransactionPayload[];
      
      if (operacion === 'Transferencia') {
        // Para transferencias, crear dos transacciones
        const salidaPayload: TransactionPayload = {
          ...basePayload,
          movimiento: {
            ...basePayload.movimiento,
            operacion: 'salida_stock',
            origen: null,
            destino: origen // En salida, el origen del form es el destino de la transacción
          }
        };
        
        const entradaPayload: TransactionPayload = {
          ...basePayload,
          movimiento: {
            ...basePayload.movimiento,
            operacion: 'entrada_stock',
            origen: null,
            destino: destino
          }
        };
        
        finalPayload = [salidaPayload, entradaPayload];
        console.log('📦 Created transfer transactions:', finalPayload);
      } else {
        // Para otras operaciones, usar transacción única
        finalPayload = basePayload;
        console.log('📦 Created single transaction:', finalPayload);
      }

      // Enviar al nuevo endpoint create-manual-transaction
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manual-transaction`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error procesando transacción: ${response.status} - ${errorData.error || 'Error desconocido'}`);
      }

      const responseData = await response.json();
      console.log('✅ Transaction processed successfully:', responseData);
      
      // Mostrar mensaje de éxito
      if (responseData.success) {
        const transactionCount = Array.isArray(finalPayload) ? finalPayload.length : 1;
        const operationType = operacion === 'Transferencia' ? 'Transferencia' : operacion;
        showToast(`✅ ${operationType} procesada exitosamente (${transactionCount} transacción${transactionCount > 1 ? 'es' : ''})`, 'success');
      } else {
        throw new Error(responseData.error || 'Error procesando transacción');
      }
      
      // Limpiar formulario
      setSelectedDestilado('');
      setSelectedProducto('');
      setCantidad('');
      setOrigen('');
      setDestino('');
      setOperacion('');
      
    } catch (error) {
      console.error('❌ Error processing transaction:', error);
      showToast('Error al procesar la transacción', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejar actualización de datos
  const handleRefreshData = async () => {
    setLoadingProducts(true);
    try {
      await loadData();
      showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast('Error al actualizar datos', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Update por Unidades</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Gestión de inventario por unidades individuales
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefreshData}
              disabled={loadingProducts}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Actualización por Unidades</h2>
            </div>

            {/* Formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Destilado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destilado
                </label>
                <select
                  value={selectedDestilado}
                  onChange={(e) => {
                    setSelectedDestilado(e.target.value);
                    setSelectedProducto(''); // Reset producto when destilado changes
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar destilado</option>
                  {destilados.map((destilado) => (
                    <option key={destilado} value={destilado}>
                      {destilado}
                    </option>
                  ))}
                </select>
              </div>

              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto
                </label>
                <select
                  value={selectedProducto}
                  onChange={(e) => setSelectedProducto(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedDestilado}
                >
                  <option value="">Seleccionar producto</option>
                  {productosDisponibles.map((producto) => (
                    <option key={producto} value={producto}>
                      {producto}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="1"
                />
              </div>

              {/* Operación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operación
                </label>
                <select
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar</option>
                  <option value="Entrada Stock">Entrada Stock</option>
                  <option value="Salida Stock">Salida Stock</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Ajuste Inventario">Ajuste Inventario</option>
                </select>
              </div>

              {/* Origen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origen
                </label>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  disabled={isOrigenDisabled}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccionar origen</option>
                  <option value="barra">Barra</option>
                  <option value="bodega">Bodega</option>
                </select>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destino
                </label>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  disabled={isDestinoDisabled}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccionar destino</option>
                  <option value="barra">Barra</option>
                  <option value="bodega">Bodega</option>
                </select>
              </div>
            </div>

            {/* Error de Transferencia */}
            {showTransferenciaError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Error: El origen y destino no pueden ser iguales en una transferencia
                  </span>
                </div>
              </div>
            )}

            {/* Vista Previa Visual */}
            {(selectedProducto || operacion || origen || destino || costoTotalMovimiento > 0) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Vista Previa del Movimiento
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {selectedProducto && (
                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Wine className="h-4 w-4" />
                      Producto: {selectedProducto} ({cantidad || '0'} unidades)
                    </div>
                  )}
                  
                  {operacion && (
                    <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Zap className="h-4 w-4" />
                      Operación: {operacion}
                    </div>
                  )}
                  
                  {origen && (
                    <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-full text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      Origen: {origen === 'barra' ? 'Barra' : 'Bodega'}
                    </div>
                  )}
                  
                  {destino && (
                    <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      Destino: {destino === 'barra' ? 'Barra' : 'Bodega'}
                    </div>
                  )}
                  
                  {costoTotalMovimiento > 0 && (
                    <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-full text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      Costo Total: ${costoTotalMovimiento.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botón de Envío */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!selectedDestilado || !selectedProducto || !cantidad || !operacion || !isTransferenciaValid || isProcessing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isProcessing ? 'Procesando...' : 'Confirmar y Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateUnidadesModule;