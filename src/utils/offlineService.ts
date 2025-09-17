/**
 * Servicio de manejo offline con caché local y sincronización
 * 
 * Funcionalidades:
 * - Caché de productos e inventario en localStorage
 * - Cola de transacciones offline
 * - Sincronización automática al recuperar conectividad
 * - Persistencia de datos para funcionamiento offline
 */

import { supabase } from './supabaseClient';

// Interfaces
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
    cantidad_unidades?: number;
    cantidad_ml?: number;
    operacion: string;
    movimiento_unidad?: string;
    origen: string | null;
    destino: string;
  };
  valores: {
    costo_transaccion: number;
  };
}

interface PendingTransaction extends TransactionPayload {
  id: string;
  createdAt: number;
  attempts: number;
}

interface CacheData {
  productos: ProductoSupabase[];
  inventario: InventarioSupabase[];
  lastUpdated: number;
  version: number;
}

class OfflineService {
  private static instance: OfflineService;
  private readonly CACHE_KEY = 'stockflow_cache';
  private readonly PENDING_TRANSACTIONS_KEY = 'stockflow_pending_transactions';
  private readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos
  private syncInProgress = false;
  private autoSyncEnabled = true;
  private onlineStatusHandler?: () => void;

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
      OfflineService.instance.initializeAutoSync();
    }
    return OfflineService.instance;
  }

  /**
   * Inicializa la sincronización automática
   */
  private initializeAutoSync() {
    this.onlineStatusHandler = () => {
      if (navigator.onLine && this.autoSyncEnabled) {
        console.log('🌐 Network detected, triggering auto-sync...');
        setTimeout(() => {
          this.autoSyncPendingTransactions();
        }, 1000); // Pequeño delay para asegurar conectividad estable
      }
    };

    // Agregar listener para cambios de conectividad
    window.addEventListener('online', this.onlineStatusHandler);
    
    // Verificar inmediatamente si hay conexión y transacciones pendientes
    if (navigator.onLine && this.getPendingTransactionCount() > 0) {
      setTimeout(() => {
        this.autoSyncPendingTransactions();
      }, 2000); // Delay inicial para permitir que la app se inicialice
    }
  }

  /**
   * Sincronización automática silenciosa
   */
  private async autoSyncPendingTransactions(): Promise<void> {
    if (!this.autoSyncEnabled || this.syncInProgress || !navigator.onLine) {
      return;
    }

    const pendingCount = this.getPendingTransactionCount();
    if (pendingCount === 0) {
      return;
    }

    console.log(`🔄 Auto-sync starting for ${pendingCount} pending transactions...`);

    try {
      await this.syncPendingTransactions();
      console.log('✅ Auto-sync completed successfully');
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
      // Programar reintentos automáticos
      setTimeout(() => {
        this.autoSyncPendingTransactions();
      }, 30000); // Reintentar en 30 segundos
    }
  }

  /**
   * Habilita/deshabilita la sincronización automática
   */
  setAutoSyncEnabled(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    console.log(`🔧 Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ===================
  // GESTIÓN DE CACHÉ
  // ===================

  /**
   * Obtiene datos del caché local
   */
  getCachedData(): CacheData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const data: CacheData = JSON.parse(cached);
      
      // Verificar si el caché ha expirado
      const now = Date.now();
      if (now - data.lastUpdated > this.CACHE_EXPIRY) {
        console.log('📅 Cache expired, clearing...');
        this.clearCache();
        return null;
      }

      console.log('💾 Using cached data:', {
        productos: data.productos.length,
        inventario: data.inventario.length,
        age: Math.round((now - data.lastUpdated) / 1000 / 60) + ' minutes'
      });

      return data;
    } catch (error) {
      console.error('❌ Error reading cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Guarda datos en el caché local
   */
  setCachedData(productos: ProductoSupabase[], inventario: InventarioSupabase[]): void {
    try {
      const cacheData: CacheData = {
        productos,
        inventario,
        lastUpdated: Date.now(),
        version: 1
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Data cached successfully:', {
        productos: productos.length,
        inventario: inventario.length
      });
    } catch (error) {
      console.error('❌ Error caching data:', error);
      // Si falla el cache (por espacio), intentar limpiar y reintentar
      this.clearCache();
      try {
        const cacheData: CacheData = {
          productos,
          inventario,
          lastUpdated: Date.now(),
          version: 1
        };
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      } catch (retryError) {
        console.error('❌ Failed to cache data after clearing:', retryError);
      }
    }
  }

  /**
   * Limpia el caché local
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ Cache cleared');
  }

  /**
   * Verifica si hay datos en caché válidos
   */
  hasCachedData(): boolean {
    return this.getCachedData() !== null;
  }

  // ===============================
  // GESTIÓN DE TRANSACCIONES OFFLINE
  // ===============================

  /**
   * Obtiene transacciones pendientes de sincronización
   */
  getPendingTransactions(): PendingTransaction[] {
    try {
      const pending = localStorage.getItem(this.PENDING_TRANSACTIONS_KEY);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('❌ Error reading pending transactions:', error);
      return [];
    }
  }

  /**
   * Agrega una transacción a la cola offline
   */
  addPendingTransaction(transaction: TransactionPayload): string {
    try {
      const pending = this.getPendingTransactions();
      const pendingTransaction: PendingTransaction = {
        ...transaction,
        id: this.generateTransactionId(),
        createdAt: Date.now(),
        attempts: 0
      };

      pending.push(pendingTransaction);
      localStorage.setItem(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
      
      console.log('📝 Transaction queued for sync:', pendingTransaction.id);
      return pendingTransaction.id;
    } catch (error) {
      console.error('❌ Error queueing transaction:', error);
      throw error;
    }
  }

  /**
   * Remueve una transacción de la cola
   */
  removePendingTransaction(transactionId: string): void {
    try {
      const pending = this.getPendingTransactions();
      const filtered = pending.filter(t => t.id !== transactionId);
      localStorage.setItem(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(filtered));
      console.log('✅ Transaction removed from queue:', transactionId);
    } catch (error) {
      console.error('❌ Error removing pending transaction:', error);
    }
  }

  /**
   * Incrementa el contador de intentos de una transacción
   */
  incrementTransactionAttempts(transactionId: string): void {
    try {
      const pending = this.getPendingTransactions();
      const transaction = pending.find(t => t.id === transactionId);
      if (transaction) {
        transaction.attempts++;
        localStorage.setItem(this.PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('❌ Error updating transaction attempts:', error);
    }
  }

  /**
   * Obtiene el conteo de transacciones pendientes
   */
  getPendingTransactionCount(): number {
    return this.getPendingTransactions().length;
  }

  // ===============================
  // SINCRONIZACIÓN
  // ===============================

  /**
   * Carga datos desde Supabase y los cachea
   */
  async loadAndCacheData(): Promise<{ productos: ProductoSupabase[], inventario: InventarioSupabase[] }> {
    console.log('🔄 Loading fresh data from Supabase...');
    
    try {
      // Cargar productos y inventario en paralelo
      const [productosResult, inventarioResult] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre, destilado, costo_unitario, capacidad_ml_por_unidad, seguimiento_stock')
          // Temporalmente removiendo el filtro para ver todos los productos
          // .eq('seguimiento_stock', true)
          .order('nombre', { ascending: true }),
        
        supabase
          .from('vista_inventario')
          .select('producto_id, producto_nombre, destilado, ubicacion, cantidad_unidades, costo_unitario, valoracion_total')
      ]);

      if (productosResult.error) {
        throw new Error(`Error cargando productos: ${productosResult.error.message}`);
      }

      if (inventarioResult.error) {
        throw new Error(`Error cargando inventario: ${inventarioResult.error.message}`);
      }

      const productos = productosResult.data || [];
      const inventario = inventarioResult.data || [];

      // Debug: verificar datos de productos
      console.log('🔍 Raw productos data sample:', productos.slice(0, 5));
      console.log('🔍 Destilados found in productos:', productos.map(p => ({ nombre: p.nombre, destilado: p.destilado })).slice(0, 10));
      
      // Verificar si hay productos sin destilado
      const productosWithoutDestilado = productos.filter(p => !p.destilado || p.destilado.trim() === '');
      if (productosWithoutDestilado.length > 0) {
        console.warn('⚠️ Products without destilado:', productosWithoutDestilado.length, productosWithoutDestilado.slice(0, 3));
      }

      // Cachear los datos
      this.setCachedData(productos, inventario);

      return { productos, inventario };
    } catch (error) {
      console.error('❌ Error loading data from Supabase:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos (del caché si está offline, de Supabase si está online)
   */
  async getData(forceRefresh = false): Promise<{ productos: ProductoSupabase[], inventario: InventarioSupabase[], fromCache: boolean }> {
    // Si estamos offline o no hay conectividad, usar caché
    if (!navigator.onLine) {
      console.log('📵 Offline mode - using cached data');
      const cached = this.getCachedData();
      if (cached) {
        return { 
          productos: cached.productos, 
          inventario: cached.inventario, 
          fromCache: true 
        };
      } else {
        throw new Error('No hay datos en caché y la aplicación está offline');
      }
    }

    // Si estamos online pero queremos forzar refresh o no hay caché válido
    if (forceRefresh || !this.hasCachedData()) {
      try {
        const { productos, inventario } = await this.loadAndCacheData();
        return { productos, inventario, fromCache: false };
      } catch (error) {
        // Si falla cargar desde Supabase, intentar usar caché como fallback
        console.log('🔄 Supabase failed, trying cache as fallback...');
        const cached = this.getCachedData();
        if (cached) {
          return { 
            productos: cached.productos, 
            inventario: cached.inventario, 
            fromCache: true 
          };
        }
        throw error;
      }
    }

    // Usar datos en caché si están disponibles
    const cached = this.getCachedData();
    if (cached) {
      return { 
        productos: cached.productos, 
        inventario: cached.inventario, 
        fromCache: true 
      };
    }

    // Si no hay caché, cargar desde Supabase
    const { productos, inventario } = await this.loadAndCacheData();
    return { productos, inventario, fromCache: false };
  }

  /**
   * Sincroniza transacciones pendientes
   */
  async syncPendingTransactions(): Promise<{ synced: number, failed: number }> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress...');
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting sync of pending transactions...');

    const pending = this.getPendingTransactions();
    if (pending.length === 0) {
      console.log('✅ No pending transactions to sync');
      this.syncInProgress = false;
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const transaction of pending) {
      try {
        console.log(`🔄 Syncing transaction ${transaction.id}...`);
        
        // Enviar al endpoint
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manual-transaction`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction)
        });

        if (response.ok) {
          this.removePendingTransaction(transaction.id);
          synced++;
          console.log(`✅ Transaction ${transaction.id} synced successfully`);
        } else {
          this.incrementTransactionAttempts(transaction.id);
          failed++;
          console.error(`❌ Failed to sync transaction ${transaction.id}:`, response.status);
          
          // Si ha fallado muchas veces, remover de la cola
          if (transaction.attempts >= 5) {
            console.log(`🗑️ Removing transaction ${transaction.id} after 5 failed attempts`);
            this.removePendingTransaction(transaction.id);
            failed--;
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing transaction ${transaction.id}:`, error);
        this.incrementTransactionAttempts(transaction.id);
        failed++;
      }
    }

    this.syncInProgress = false;
    console.log(`✅ Sync completed: ${synced} synced, ${failed} failed`);
    
    return { synced, failed };
  }

  // ===============================
  // UTILIDADES
  // ===============================

  private generateTransactionId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Procesa una transacción (online o offline)
   */
  async processTransaction(transaction: TransactionPayload): Promise<{ success: boolean, offline: boolean, transactionId?: string }> {
    if (navigator.onLine) {
      try {
        // Intentar procesar online directamente
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manual-transaction`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction)
        });

        if (response.ok) {
          console.log('✅ Transaction processed online successfully');
          return { success: true, offline: false };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.log('❌ Online processing failed, queueing for offline sync:', error);
        // Si falla online, agregar a la cola offline
        const transactionId = this.addPendingTransaction(transaction);
        return { success: true, offline: true, transactionId };
      }
    } else {
      // Si estamos offline, agregar directamente a la cola
      console.log('📵 Offline mode - queueing transaction');
      const transactionId = this.addPendingTransaction(transaction);
      return { success: true, offline: true, transactionId };
    }
  }

  /**
   * Limpia todos los datos offline
   */
  clearAllOfflineData(): void {
    this.clearCache();
    localStorage.removeItem(this.PENDING_TRANSACTIONS_KEY);
    console.log('🗑️ All offline data cleared');
  }

  /**
   * Limpia los listeners para evitar memory leaks
   */
  cleanup(): void {
    if (this.onlineStatusHandler) {
      window.removeEventListener('online', this.onlineStatusHandler);
    }
  }
}

export default OfflineService;