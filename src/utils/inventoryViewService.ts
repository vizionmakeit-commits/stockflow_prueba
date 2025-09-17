import { supabase } from './supabaseClient';

// Tipos TypeScript para la vista_inventario
export interface InventoryViewItem {
  producto_id: string;
  producto_nombre: string;
  destilado: string;
  ubicacion: string;
  cantidad_ml: number;
  capacidad_ml_por_unidad: number;
  cantidad_unidades: number;
  costo_unitario: number;
  valoracion_total: number;
  updated_at: string;
}

// Tipos para datos procesados
export interface ProductSummary {
  producto_id: string;
  producto_nombre: string;
  destilado: string;
  total_stock: number;
  total_valuation: number;
  locations: LocationBreakdown[];
}

export interface LocationBreakdown {
  ubicacion: string;
  cantidad_unidades: number;
  valoracion_total: number;
}

export interface LocationSummary {
  ubicacion: string;
  total_stock: number;
  total_valuation: number;
}

export interface InventoryStats {
  totalStock: number;
  totalValuation: number;
  locationSummaries: LocationSummary[];
  productSummaries: ProductSummary[];
  uniqueLocations: string[];
}

// Servicio para manejar datos de vista_inventario
export class InventoryViewService {
  
  // Función principal para obtener todos los datos de inventario
  static async getInventoryData(): Promise<{
    success: boolean;
    data?: InventoryStats;
    error?: string;
  }> {
    try {
      console.log('🔄 Fetching inventory data from vista_inventario...');
      
      // Query única a la vista_inventario
      const { data: inventario, error } = await supabase
        .from('vista_inventario')
        .select('*')
        .order('producto_nombre', { ascending: true });

      if (error) {
        console.error('❌ Error fetching inventory data:', error);
        return {
          success: false,
          error: `Database error: ${error.message}`
        };
      }

      if (!inventario || inventario.length === 0) {
        console.warn('⚠️ No inventory data found');
        return {
          success: true,
          data: {
            totalStock: 0,
            totalValuation: 0,
            locationSummaries: [],
            productSummaries: [],
            uniqueLocations: []
          }
        };
      }

      console.log('✅ Raw inventory data loaded:', inventario.length, 'records');

      // Procesar datos para generar estadísticas dinámicas
      const processedData = this.processInventoryData(inventario);
      
      console.log('📊 Processed inventory stats:', {
        totalProducts: processedData.productSummaries.length,
        totalLocations: processedData.uniqueLocations.length,
        totalStock: processedData.totalStock,
        totalValuation: processedData.totalValuation
      });

      return {
        success: true,
        data: processedData
      };

    } catch (error) {
      console.error('❌ Critical error in getInventoryData:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Procesar datos raw para generar estadísticas dinámicas
  private static processInventoryData(rawData: InventoryViewItem[]): InventoryStats {
    console.log('🔄 Processing raw inventory data...');

    // 1. Extraer ubicaciones únicas dinámicamente
    const uniqueLocations = [...new Set(rawData.map(item => item.ubicacion))].sort();
    console.log('📍 Unique locations found:', uniqueLocations);

    // 2. Calcular totales generales
    const totalStock = rawData.reduce((sum, item) => sum + item.cantidad_unidades, 0);
    const totalValuation = rawData.reduce((sum, item) => sum + item.valoracion_total, 0);

    // 3. Generar resúmenes por ubicación dinámicamente
    const locationSummaries: LocationSummary[] = uniqueLocations.map(ubicacion => {
      const locationItems = rawData.filter(item => item.ubicacion === ubicacion);
      return {
        ubicacion,
        total_stock: locationItems.reduce((sum, item) => sum + item.cantidad_unidades, 0),
        total_valuation: locationItems.reduce((sum, item) => sum + item.valoracion_total, 0)
      };
    });

    // 4. Agrupar por producto y generar resúmenes
    const productMap = new Map<string, ProductSummary>();

    rawData.forEach(item => {
      const key = `${item.producto_id}-${item.producto_nombre}`;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          destilado: item.destilado,
          total_stock: 0,
          total_valuation: 0,
          locations: []
        });
      }

      const product = productMap.get(key)!;
      product.total_stock += item.cantidad_unidades;
      product.total_valuation += item.valoracion_total;
      
      // Agregar breakdown por ubicación
      product.locations.push({
        ubicacion: item.ubicacion,
        cantidad_unidades: item.cantidad_unidades,
        valoracion_total: item.valoracion_total
      });
    });

    // Ordenar productos por destilado (primario) y producto_nombre (secundario) alfabéticamente
    const productSummaries = Array.from(productMap.values()).sort((a, b) => {
      // Ordenamiento primario por destilado
      const destiladoComparison = a.destilado.localeCompare(b.destilado);
      if (destiladoComparison !== 0) {
        return destiladoComparison;
      }
      // Ordenamiento secundario por producto_nombre
      return a.producto_nombre.localeCompare(b.producto_nombre);
    });

    console.log('✅ Data processing completed:', {
      products: productSummaries.length,
      locations: uniqueLocations.length,
      locationSummaries: locationSummaries.length
    });

    return {
      totalStock,
      totalValuation,
      locationSummaries,
      productSummaries,
      uniqueLocations
    };
  }

  // Función auxiliar para formatear nombres de ubicaciones
  static formatLocationName(ubicacion: string): string {
    return ubicacion.charAt(0).toUpperCase() + ubicacion.slice(1).toLowerCase();
  }

  // Función auxiliar para obtener color de ubicación
  static getLocationColor(ubicacion: string): string {
    const colorMap: { [key: string]: string } = {
      'barra': 'from-blue-500 to-blue-600',
      'bodega': 'from-green-500 to-green-600',
      'terraza': 'from-purple-500 to-purple-600',
      'cocina': 'from-orange-500 to-orange-600',
      'almacen': 'from-gray-500 to-gray-600'
    };
    
    return colorMap[ubicacion.toLowerCase()] || 'from-indigo-500 to-indigo-600';
  }
}