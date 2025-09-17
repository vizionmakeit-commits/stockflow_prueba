import { supabase } from './supabaseClient';

export interface Transaction {
  id_transaccion: number;
  timestamp: string;
 id_usuario: string;
  tipo_transaccion: string;
  origen_tipo: string | null;
  origen_nombre: string | null;
  producto_nombre: string;
  producto_destilado: string;
  movimiento_cantidad: number;
  movimiento_unidad: string;
  operacion: string;
  origen_movimiento: string | null;
  destino_movimiento: string;
  costo_transaccion: number;
  id_venta: number | null;
  created_at: string;
}

export interface TransactionSummary {
  total_transactions: number;
  total_cost: number;
  total_revenue: number;
  operations_count: {
    entrada_stock: number;
    salida_stock: number;
    transferencia: number;
    ajuste_inventario: number;
  };
}

export class TransactionService {
  
  // Get all transactions with optional filtering
  static async getAllTransactions(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      tipo_transaccion?: string;
      producto_nombre?: string;
      operacion?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<Transaction[]> {
    try {
      let query = supabase
        .from('transacciones')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters if provided
      if (filters?.tipo_transaccion) {
        query = query.eq('tipo_transaccion', filters.tipo_transaccion);
      }
      
      if (filters?.producto_nombre) {
        query = query.ilike('producto_nombre', `%${filters.producto_nombre}%`);
      }
      
      if (filters?.operacion) {
        query = query.eq('operacion', filters.operacion);
      }
      
      if (filters?.date_from) {
        query = query.gte('timestamp', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('timestamp', filters.date_to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllTransactions:', error);
      return [];
    }
  }

  // Get transaction by ID
  static async getTransactionById(id: number): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('id_transaccion', id)
        .single();

      if (error) {
        console.error('Error fetching transaction:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      return null;
    }
  }

  // Get transaction summary statistics
  static async getTransactionSummary(
    dateFrom?: string,
    dateTo?: string
  ): Promise<TransactionSummary> {
    try {
      let query = supabase
        .from('transacciones')
        .select('operacion, costo_transaccion, precio_venta_receta');

      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('timestamp', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transaction summary:', error);
        throw error;
      }

      const summary: TransactionSummary = {
        total_transactions: data?.length || 0,
        total_cost: 0,
        total_revenue: 0,
        operations_count: {
          entrada_stock: 0,
          salida_stock: 0,
          transferencia: 0,
          ajuste_inventario: 0
        }
      };

      data?.forEach(transaction => {
        summary.total_cost += transaction.costo_transaccion || 0;
        
        if (transaction.operacion in summary.operations_count) {
          summary.operations_count[transaction.operacion as keyof typeof summary.operations_count]++;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error in getTransactionSummary:', error);
      return {
        total_transactions: 0,
        total_cost: 0,
        total_revenue: 0,
        operations_count: {
          entrada_stock: 0,
          salida_stock: 0,
          transferencia: 0,
          ajuste_inventario: 0
        }
      };
    }
  }

  // Get transactions by product
  static async getTransactionsByProduct(
    productName: string,
    destilado: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('producto_nombre', productName)
        .eq('producto_destilado', destilado)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions by product:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionsByProduct:', error);
      return [];
    }
  }

  // Get recent transactions
  static async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return this.getAllTransactions(limit, 0);
  }
}