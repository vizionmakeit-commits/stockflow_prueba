import { supabase } from './supabaseClient';

export interface AlertConfiguration {
  id: number;
  alerta_stock_critico_activada: boolean;
  alerta_ajuste_manual_activada: boolean;
  created_at: string;
  updated_at: string;
  reporte_reposicion_activado: boolean;
  reporte_frecuencia: string;
  reporte_dia: string;
  reporte_hora: string;
}

export class AlertConfigService {
  
  // Get current alert configuration
  static async getAlertConfiguration(): Promise<AlertConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('configuracion_alertas')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching alert configuration:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getAlertConfiguration:', error);
      return null;
    }
  }

  // Update critical stock alert setting
  static async updateCriticalStockAlert(enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracion_alertas')
        .update({ alerta_stock_critico_activada: enabled })
        .eq('id', 1);

      if (error) {
        console.error('Error updating critical stock alert:', error);
        throw error;
      }

      console.log('Critical stock alert updated:', enabled);
      return true;
    } catch (error) {
      console.error('Error in updateCriticalStockAlert:', error);
      return false;
    }
  }

  // Update manual adjustment alert setting
  static async updateManualAdjustmentAlert(enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracion_alertas')
        .update({ alerta_ajuste_manual_activada: enabled })
        .eq('id', 1);

      if (error) {
        console.error('Error updating manual adjustment alert:', error);
        throw error;
      }

      console.log('Manual adjustment alert updated:', enabled);
      return true;
    } catch (error) {
      console.error('Error in updateManualAdjustmentAlert:', error);
      return false;
    }
  }

  // Update both alert settings at once
  static async updateAlertConfiguration(
    criticalStockEnabled: boolean,
    manualAdjustmentEnabled: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracion_alertas')
        .update({
          alerta_stock_critico_activada: criticalStockEnabled,
          alerta_ajuste_manual_activada: manualAdjustmentEnabled
        })
        .eq('id', 1);

      if (error) {
        console.error('Error updating alert configuration:', error);
        throw error;
      }

      console.log('Alert configuration updated:', {
        criticalStock: criticalStockEnabled,
        manualAdjustment: manualAdjustmentEnabled
      });
      return true;
    } catch (error) {
      console.error('Error in updateAlertConfiguration:', error);
      return false;
    }
  }

  // Update scheduled report configuration
  static async updateScheduledReportConfig(
    enabled: boolean,
    frequency: string,
    day: string,
    hour: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracion_alertas')
        .update({
          reporte_reposicion_activado: enabled,
          reporte_frecuencia: frequency,
          reporte_dia: day,
          reporte_hora: hour
        })
        .eq('id', 1);

      if (error) {
        console.error('Error updating scheduled report configuration:', error);
        throw error;
      }

      console.log('Scheduled report configuration updated:', {
        enabled,
        frequency,
        day,
        hour
      });
      return true;
    } catch (error) {
      console.error('Error in updateScheduledReportConfig:', error);
      return false;
    }
  }

  // Update only the scheduled report enabled status
  static async updateScheduledReportEnabled(enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracion_alertas')
        .update({ reporte_reposicion_activado: enabled })
        .eq('id', 1);

      if (error) {
        console.error('Error updating scheduled report enabled status:', error);
        throw error;
      }

      console.log('Scheduled report enabled status updated:', enabled);
      return true;
    } catch (error) {
      console.error('Error in updateScheduledReportEnabled:', error);
      return false;
    }
  }
}