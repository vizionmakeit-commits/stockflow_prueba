import React, { useState, useEffect } from 'react';
import { Bell, Settings, CheckCircle, AlertTriangle, Wrench, RefreshCw, Calendar, Clock, Eye } from 'lucide-react';
import { AlertConfigService, AlertConfiguration } from '../utils/alertConfigService';
import { ScheduledReportService } from '../utils/scheduledReportService';

interface AlertSettingsProps {
  criticalItemsCount: number;
}

const AlertSettings: React.FC<AlertSettingsProps> = ({ criticalItemsCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfiguration | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Instancia del servicio de reportes programados
  const [reportService] = useState(() => ScheduledReportService.getInstance());
  
  // Estado para mostrar información del próximo reporte
  const [nextReportInfo, setNextReportInfo] = useState<{
    nextReportTime: Date | null;
    timeUntilNext: number | null;
  }>({ nextReportTime: null, timeUntilNext: null });

  // Estados para configuración de reportes programados
  const [reportConfig, setReportConfig] = useState({
    enabled: false,
    frequency: 'weekly',
    day: 'monday',
    hour: '09:00'
  });

  // Load alert configuration from database
  const loadAlertConfiguration = async () => {
    setLoadingConfig(true);
    try {
      const config = await AlertConfigService.getAlertConfiguration();
      if (config) {
        setAlertConfig(config);
        console.log('Alert configuration loaded:', config);
      }
    } catch (error) {
      console.error('Error loading alert configuration:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Load configuration on component mount
  useEffect(() => {
    loadAlertConfiguration();
  }, []);

  // Update local report config when alertConfig changes
  useEffect(() => {
    if (alertConfig) {
      setReportConfig({
        enabled: alertConfig.reporte_reposicion_activado,
        frequency: alertConfig.reporte_frecuencia,
        day: alertConfig.reporte_dia,
        hour: alertConfig.reporte_hora
      });
      
      // Actualizar información del próximo reporte
      updateNextReportInfo();
    }
  }, [alertConfig]);
  
  // Función para actualizar información del próximo reporte
  const updateNextReportInfo = () => {
    const status = reportService.getSchedulerStatus();
    setNextReportInfo({
      nextReportTime: status.nextReportTime,
      timeUntilNext: status.timeUntilNext
    });
  };
  
  // Formatear tiempo restante
  const formatTimeUntilNext = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Update critical stock alert
  const handleCriticalStockToggle = async (enabled: boolean) => {
    setSavingConfig(true);
    try {
      const success = await AlertConfigService.updateCriticalStockAlert(enabled);
      if (success && alertConfig) {
        setAlertConfig({
          ...alertConfig,
          alerta_stock_critico_activada: enabled
        });
        console.log('Critical stock alert updated:', enabled);
      }
    } catch (error) {
      console.error('Error updating critical stock alert:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Update manual adjustment alert
  const handleManualAdjustmentToggle = async (enabled: boolean) => {
    setSavingConfig(true);
    try {
      const success = await AlertConfigService.updateManualAdjustmentAlert(enabled);
      if (success && alertConfig) {
        setAlertConfig({
          ...alertConfig,
          alerta_ajuste_manual_activada: enabled
        });
        console.log('Manual adjustment alert updated:', enabled);
      }
    } catch (error) {
      console.error('Error updating manual adjustment alert:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Update scheduled report configuration
  const handleScheduledReportToggle = async (enabled: boolean) => {
    setSavingConfig(true);
    try {
      const success = await AlertConfigService.updateScheduledReportEnabled(enabled);
      if (success && alertConfig) {
        const updatedConfig = {
          ...alertConfig,
          reporte_reposicion_activado: enabled
        };
        
        setAlertConfig(updatedConfig);
        setReportConfig(prev => ({ ...prev, enabled }));
        
        // Actualizar el auto-trigger
        await reportService.updateConfiguration(updatedConfig);
        
        console.log('Scheduled report enabled status updated:', enabled);
      }
    } catch (error) {
      console.error('Error updating scheduled report status:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Update scheduled report configuration details
  const handleScheduledReportConfigUpdate = async () => {
    setSavingConfig(true);
    try {
      const success = await AlertConfigService.updateScheduledReportConfig(
        reportConfig.enabled,
        reportConfig.frequency,
        reportConfig.day,
        reportConfig.hour
      );
      
      if (success && alertConfig) {
        const updatedConfig = {
          ...alertConfig,
          reporte_reposicion_activado: reportConfig.enabled,
          reporte_frecuencia: reportConfig.frequency,
          reporte_dia: reportConfig.day,
          reporte_hora: reportConfig.hour
        };
        
        setAlertConfig(updatedConfig);
        
        // Actualizar el auto-trigger con la nueva configuración
        await reportService.updateConfiguration(updatedConfig);
        
        console.log('Scheduled report configuration updated:', reportConfig);
      }
    } catch (error) {
      console.error('Error updating scheduled report configuration:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  // Get day options based on frequency
  const getDayOptions = () => {
    switch (reportConfig.frequency) {
      case 'weekly':
        return [
          { value: 'monday', label: 'Lunes' },
          { value: 'tuesday', label: 'Martes' },
          { value: 'wednesday', label: 'Miércoles' },
          { value: 'thursday', label: 'Jueves' },
          { value: 'friday', label: 'Viernes' },
          { value: 'saturday', label: 'Sábado' },
          { value: 'sunday', label: 'Domingo' }
        ];
      case 'biweekly':
      case 'monthly':
        return Array.from({ length: 31 }, (_, i) => ({
          value: (i + 1).toString(),
          label: `Día ${i + 1}`
        }));
      default:
        return [];
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sistema de Alertas</h3>
              <p className="text-sm text-gray-600">
                {criticalItemsCount > 0 
                  ? `${criticalItemsCount} productos en estado crítico`
                  : 'Todos los productos tienen stock adecuado'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            <span className="font-medium">Configurar</span>
          </button>
        </div>
      </div>

      {/* Expanded Configuration */}
      {isExpanded && (
        <div className="p-6 bg-gray-50">
          <div className="space-y-4">
            {/* Database-driven Alert Configuration */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Configuración de Alertas
                </h4>
                
                <button
                  onClick={loadAlertConfiguration}
                  disabled={loadingConfig}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingConfig ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
              
              {loadingConfig ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 text-gray-600">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Cargando configuración...
                  </div>
                </div>
              ) : alertConfig ? (
                <div className="space-y-6">
                  {/* Critical Stock Alert Toggle */}
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <h5 className="font-medium text-gray-900">Alerta de Stock Crítico</h5>
                        <p className="text-sm text-gray-600">
                          Recibir una notificación inmediata cuando un producto cae por debajo de su stock mínimo
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertConfig.alerta_stock_critico_activada}
                        onChange={(e) => handleCriticalStockToggle(e.target.checked)}
                        disabled={savingConfig}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* Manual Adjustment Alert Toggle */}
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-orange-600" />
                      <div>
                        <h5 className="font-medium text-gray-900">Alerta por Ajuste Manual de Inventario</h5>
                        <p className="text-sm text-gray-600">
                          Recibir una notificación cada vez que se realice una operación de 'ajuste_inventario'
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertConfig.alerta_ajuste_manual_activada}
                        onChange={(e) => handleManualAdjustmentToggle(e.target.checked)}
                        disabled={savingConfig}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {savingConfig && (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                        Guardando configuración...
                      </div>
                    </div>
                  )}

                  {/* Scheduled Report Configuration */}
                  <div className="space-y-4 pt-6 border-t border-gray-200">
                    <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Reporte de Reposición de Stock
                    </h5>

                    {/* Main Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div>
                          <h6 className="font-medium text-gray-900">Reporte Programado de Reposición</h6>
                          <p className="text-sm text-gray-600">
                            Generar automáticamente reportes de productos que necesitan reposición
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reportConfig.enabled}
                          onChange={(e) => handleScheduledReportToggle(e.target.checked)}
                          disabled={savingConfig}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Scheduling Configuration - Only show when enabled */}
                    {reportConfig.enabled && (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-6">
                        <h6 className="font-medium text-gray-900 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-600" />
                          Configuración de Programación
                        </h6>

                        {/* Frequency Selection */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Frecuencia del Reporte
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { value: 'daily', label: 'Diario' },
                              { value: 'weekly', label: 'Semanal' },
                              { value: 'biweekly', label: 'Quincenal' },
                              { value: 'monthly', label: 'Mensual' }
                            ].map((freq) => (
                              <label key={freq.value} className="relative">
                                <input
                                  type="radio"
                                  name="frequency"
                                  value={freq.value}
                                  checked={reportConfig.frequency === freq.value}
                                  onChange={(e) => setReportConfig(prev => ({ 
                                    ...prev, 
                                    frequency: e.target.value,
                                    day: e.target.value === 'weekly' ? 'monday' : '1' // Reset day when frequency changes
                                  }))}
                                  className="sr-only peer"
                                />
                                <div className="flex items-center justify-center p-3 border border-gray-300 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:bg-gray-50 transition-all">
                                  <span className="text-sm font-medium">{freq.label}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Day Selection - Progressive disclosure based on frequency */}
                        {reportConfig.frequency !== 'daily' && (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              {reportConfig.frequency === 'weekly' ? 'Día de la Semana' : 'Día del Mes'}
                            </label>
                            <select
                              value={reportConfig.day}
                              onChange={(e) => setReportConfig(prev => ({ ...prev, day: e.target.value }))}
                              className="w-full md:w-auto rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {getDayOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Time Selection */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Hora de Envío
                          </label>
                          <select
                            value={reportConfig.hour}
                            onChange={(e) => setReportConfig(prev => ({ ...prev, hour: e.target.value }))}
                            className="w-full md:w-auto rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              return (
                                <option key={hour} value={`${hour}:00`}>
                                  {hour}:00
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-xs text-gray-500">
                            Zona horaria: America/Mazatlán (GMT-7)
                          </p>
                        </div>

                        {/* Save Configuration Button */}
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                          <button
                            onClick={handleScheduledReportConfigUpdate}
                            disabled={savingConfig}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                          >
                            {savingConfig ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Settings className="h-4 w-4" />
                            )}
                            {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
                          </button>
                        </div>

                        {/* Preview */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h6 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Vista Previa de Programación
                          </h6>
                          <p className="text-sm text-blue-700">
                            {reportConfig.frequency === 'daily' && 
                              `El reporte se enviará todos los días a las ${reportConfig.hour}`
                            }
                            {reportConfig.frequency === 'weekly' && 
                              `El reporte se enviará todos los ${getDayOptions().find(d => d.value === reportConfig.day)?.label.toLowerCase()} a las ${reportConfig.hour}`
                            }
                            {reportConfig.frequency === 'biweekly' && 
                              `El reporte se enviará cada 15 días (día ${reportConfig.day} del mes) a las ${reportConfig.hour}`
                            }
                            {reportConfig.frequency === 'monthly' && 
                              `El reporte se enviará el día ${reportConfig.day} de cada mes a las ${reportConfig.hour}`
                            }
                          </p>
                          
                          {/* Próximo Reporte */}
                          {nextReportInfo.nextReportTime && nextReportInfo.timeUntilNext && nextReportInfo.timeUntilNext > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-800">Próximo reporte:</span>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-blue-900">
                                    {nextReportInfo.nextReportTime.toLocaleDateString('es-ES', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })} a las {nextReportInfo.nextReportTime.toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    En {formatTimeUntilNext(nextReportInfo.timeUntilNext)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Error al cargar la configuración de alertas</p>
                  <button
                    onClick={loadAlertConfiguration}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Status */}
      {!isExpanded && (
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Stock Crítico: {alertConfig?.alerta_stock_critico_activada ? (
                  <span className="text-green-600 font-medium">✓ Activado</span>
                ) : (
                  <span className="text-gray-500">○ Desactivado</span>
                )}
              </span>
              <span className="text-gray-600">
                Ajuste Manual: {alertConfig?.alerta_ajuste_manual_activada ? (
                  <span className="text-green-600 font-medium">✓ Activado</span>
                ) : (
                  <span className="text-gray-500">○ Desactivado</span>
                )}
              </span>
              <span className="text-gray-600">
                Reporte: {alertConfig?.reporte_reposicion_activado ? (
                  <span className="text-green-600 font-medium">
                    ✓ Activado
                    {nextReportInfo.nextReportTime && nextReportInfo.timeUntilNext && nextReportInfo.timeUntilNext > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        (próximo en {formatTimeUntilNext(nextReportInfo.timeUntilNext)})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-500">○ Desactivado</span>
                )}
              </span>
            </div>
            
            {criticalItemsCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                {criticalItemsCount} productos críticos
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertSettings;