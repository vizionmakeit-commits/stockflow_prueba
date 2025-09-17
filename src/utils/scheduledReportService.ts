// Servicio para manejo inteligente de reportes programados
// Auto-trigger que se ejecuta solo cuando es necesario

import { AlertConfigService, AlertConfiguration } from './alertConfigService';

export class ScheduledReportService {
  private static instance: ScheduledReportService | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private currentConfig: AlertConfiguration | null = null;

  // Singleton pattern para evitar múltiples instancias
  static getInstance(): ScheduledReportService {
    if (!this.instance) {
      this.instance = new ScheduledReportService();
    }
    return this.instance;
  }

  // Inicializar el servicio
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando ScheduledReportService...');
    
    try {
      // Cargar configuración actual
      await this.loadConfiguration();
      
      // Programar próximo reporte si está habilitado
      if (this.currentConfig?.reporte_reposicion_activado) {
        this.scheduleNextReport();
      }
      
      this.isActive = true;
      console.log('✅ ScheduledReportService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando ScheduledReportService:', error);
    }
  }

  // Cargar configuración desde la base de datos
  private async loadConfiguration(): Promise<void> {
    try {
      const config = await AlertConfigService.getAlertConfiguration();
      this.currentConfig = config;
      console.log('📋 Configuración de reportes cargada:', {
        enabled: config?.reporte_reposicion_activado,
        frequency: config?.reporte_frecuencia,
        day: config?.reporte_dia,
        hour: config?.reporte_hora
      });
    } catch (error) {
      console.error('Error cargando configuración de reportes:', error);
      this.currentConfig = null;
    }
  }

  // Calcular el próximo momento de envío
  private calculateNextReportTime(): Date | null {
    if (!this.currentConfig || !this.currentConfig.reporte_reposicion_activado) {
      return null;
    }

    const now = new Date();
    const [hour, minute] = this.currentConfig.reporte_hora.split(':').map(Number);
    
    // Crear fecha base para hoy a la hora programada
    const today = new Date();
    today.setHours(hour, minute || 0, 0, 0);
    
    let nextReportDate: Date;

    switch (this.currentConfig.reporte_frecuencia) {
      case 'daily':
        // Si ya pasó la hora de hoy, programar para mañana
        nextReportDate = now > today ? 
          new Date(today.getTime() + 24 * 60 * 60 * 1000) : today;
        break;

      case 'weekly':
        const dayMap: { [key: string]: number } = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        const targetDay = dayMap[this.currentConfig.reporte_dia];
        const currentDay = now.getDay();
        
        // Calcular días hasta el próximo día objetivo
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && now > today)) {
          daysUntilTarget += 7; // Próxima semana
        }
        
        nextReportDate = new Date(today.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
        break;

      case 'biweekly':
        const biweeklyDay = parseInt(this.currentConfig.reporte_dia);
        const currentDate = now.getDate();
        
        // Próximas fechas posibles: día X y día X+15 del mes actual, o día X del próximo mes
        const possibleDates = [
          biweeklyDay,
          biweeklyDay + 15,
          // Próximo mes
          biweeklyDay + (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
        ];
        
        let nextBiweeklyDate = possibleDates.find(date => {
          const testDate = new Date(now.getFullYear(), now.getMonth(), date, hour, minute || 0);
          return testDate > now;
        });
        
        if (!nextBiweeklyDate) {
          // Si no hay fecha válida este mes, usar el día del próximo mes
          nextBiweeklyDate = biweeklyDay;
          nextReportDate = new Date(now.getFullYear(), now.getMonth() + 1, nextBiweeklyDate, hour, minute || 0);
        } else {
          nextReportDate = new Date(now.getFullYear(), now.getMonth(), nextBiweeklyDate, hour, minute || 0);
        }
        break;

      case 'monthly':
        const monthlyDay = parseInt(this.currentConfig.reporte_dia);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), monthlyDay, hour, minute || 0);
        
        // Si ya pasó este mes, programar para el próximo
        nextReportDate = now > thisMonth ?
          new Date(now.getFullYear(), now.getMonth() + 1, monthlyDay, hour, minute || 0) : thisMonth;
        break;

      default:
        console.warn('Frecuencia de reporte no reconocida:', this.currentConfig.reporte_frecuencia);
        return null;
    }

    return nextReportDate;
  }

  // Programar el próximo reporte
  private scheduleNextReport(): void {
    // Limpiar timeout anterior si existe
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const nextReportTime = this.calculateNextReportTime();
    
    if (!nextReportTime) {
      console.log('⏸️ No se puede calcular próximo reporte o está deshabilitado');
      return;
    }

    const now = new Date();
    const timeUntilReport = nextReportTime.getTime() - now.getTime();
    
    if (timeUntilReport <= 0) {
      console.warn('⚠️ Tiempo calculado es en el pasado, recalculando...');
      // Intentar recalcular agregando un día
      const tomorrow = new Date(nextReportTime.getTime() + 24 * 60 * 60 * 1000);
      const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
      
      if (timeUntilTomorrow > 0) {
        this.scheduleTimeout(timeUntilTomorrow, tomorrow);
      }
      return;
    }

    this.scheduleTimeout(timeUntilReport, nextReportTime);
  }

  // Programar timeout específico
  private scheduleTimeout(timeUntilReport: number, nextReportTime: Date): void {
    // Máximo timeout en JavaScript es ~24.8 días
    const maxTimeout = 2147483647; // 2^31 - 1 ms
    
    if (timeUntilReport > maxTimeout) {
      // Si es más de 24 días, programar para revisar en 24 horas
      console.log('⏰ Reporte muy lejano, reprogramando verificación en 24 horas');
      this.timeoutId = setTimeout(() => {
        this.scheduleNextReport();
      }, 24 * 60 * 60 * 1000);
      return;
    }

    console.log('⏰ Próximo reporte programado para:', nextReportTime.toLocaleString('es-ES', {
      timeZone: 'America/Mazatlan',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }));
    console.log('⏱️ Tiempo hasta próximo reporte:', Math.round(timeUntilReport / 1000 / 60), 'minutos');

    this.timeoutId = setTimeout(async () => {
      await this.executeScheduledReport();
      // Después de ejecutar, programar el siguiente
      this.scheduleNextReport();
    }, timeUntilReport);
  }

  // Ejecutar reporte programado
  private async executeScheduledReport(): Promise<void> {
    console.log('📊 EJECUTANDO REPORTE PROGRAMADO...');
    
    try {
      // Verificar que la configuración sigue activa
      await this.loadConfiguration();
      
      if (!this.currentConfig?.reporte_reposicion_activado) {
        console.log('⏸️ Reportes deshabilitados, cancelando ejecución');
        return;
      }

      // Llamar a la Edge Function de scheduled-reports
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-reports`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger_source: 'auto_scheduler',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Reporte programado ejecutado exitosamente:', result);
      } else {
        console.error('❌ Error ejecutando reporte programado:', response.status);
      }
      
    } catch (error) {
      console.error('❌ Error en executeScheduledReport:', error);
    }
  }

  // Actualizar configuración y reprogramar
  async updateConfiguration(newConfig: AlertConfiguration): Promise<void> {
    console.log('🔄 Actualizando configuración de reportes...');
    
    this.currentConfig = newConfig;
    
    // Limpiar timeout actual
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Reprogramar si está habilitado
    if (newConfig.reporte_reposicion_activado) {
      this.scheduleNextReport();
      console.log('✅ Reporte reprogramado con nueva configuración');
    } else {
      console.log('⏸️ Reportes deshabilitados, auto-trigger pausado');
    }
  }

  // Obtener estado actual del scheduler
  getSchedulerStatus(): {
    isActive: boolean;
    nextReportTime: Date | null;
    timeUntilNext: number | null;
    currentConfig: AlertConfiguration | null;
  } {
    const nextReportTime = this.calculateNextReportTime();
    const timeUntilNext = nextReportTime ? nextReportTime.getTime() - new Date().getTime() : null;
    
    return {
      isActive: this.isActive && !!this.timeoutId,
      nextReportTime,
      timeUntilNext,
      currentConfig: this.currentConfig
    };
  }

  // Forzar ejecución inmediata (para pruebas)
  async forceExecuteReport(): Promise<void> {
    console.log('🧪 FORZANDO ejecución de reporte para pruebas...');
    await this.executeScheduledReport();
  }

  // Detener el scheduler
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isActive = false;
    console.log('⏹️ ScheduledReportService detenido');
  }
}