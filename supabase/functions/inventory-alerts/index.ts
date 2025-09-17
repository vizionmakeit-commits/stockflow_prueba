/*
  # Inventory Alerts Edge Function

  1. Purpose
    - Process real-time inventory alerts based on database configuration
    - Handle critical stock alerts when products fall below minimum levels
    - Handle manual adjustment alerts for inventory operations
    - Send webhook notifications only when alerts are enabled in configuration

  2. Functionality
    - Check alert configuration from configuracion_alertas table
    - Process critical stock alerts with exact JSON format
    - Process manual adjustment alerts with exact JSON format
    - Send webhooks only when corresponding alerts are enabled

  3. Security
    - CORS enabled for frontend requests
    - Database configuration validation
    - Error handling and logging
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

// Webhook endpoint for alerts
const ALERTS_WEBHOOK_URL = 'https://n8n-n8n.inrxey.easypanel.host/webhook/447acc74-dd19-43ec-b9cc-18d49c192ec4';

// Interfaces for alert types
interface CriticalStockAlert {
  tipo_alerta: "alerta_stock_critico";
  timestamp: string;
  productos_criticos: Array<{
    producto: string;
    stock_actual: number;
    stock_minimo: number;
    stock_optimo: number;
    cantidad_a_comprar: number;
  }>;
}

interface ManualAdjustmentAlert {
  tipo_alerta: "alerta_ajuste_stock";
  transaccion: {
    ID_transaccion: number;
    id_venta: number | null;
    id_usuario: string;
    tipo_transaccion: string;
    timestamp: string;
    producto: {
      nombre: string;
      destilado: string;
    };
    movimiento: {
      cantidad_unidades?: number;
      cantidad_ml?: number;
      operacion: string;
      origen: string | null;
      destino: string;
    };
    valores: {
      costo_transaccion: number;
    };
  };
}

interface InventoryItem {
  destilado: string;
  producto: string;
  stock_barra: number;
  stock_bodega: number;
  stock_total: number;
  costo_unitario: number;
  valoracion: number;
  stock_minimo: number;
  stock_optimo: number;
}

interface TransactionData {
  ID_transaccion: number;
  id_venta: number | null;
  id_usuario: string;
  tipo_transaccion: string;
  timestamp: string;
  producto: {
    nombre: string;
    destilado: string;
  };
  movimiento: {
    cantidad_unidades?: number;
    cantidad_ml?: number;
    operacion: string;
    origen: string | null;
    destino: string;
  };
  valores: {
    costo_transaccion: number;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function to send alert to webhook
async function sendAlertWebhook(alertData: CriticalStockAlert | ManualAdjustmentAlert): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Sending alert to webhook:', ALERTS_WEBHOOK_URL);
    console.log('Alert data:', JSON.stringify(alertData, null, 2));
    
    const response = await fetch(ALERTS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StockFlow-Alert-System/1.0',
      },
      body: JSON.stringify(alertData),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Alert webhook failed:', response.status, errorText);
      return { 
        success: false, 
        error: `Alert webhook failed: ${response.status} - ${errorText}` 
      };
    }

    const responseData = await response.text().catch(() => 'No response data');
    console.log('Alert webhook success:', responseData);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending alert webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown webhook error' 
    };
  }
}

// Helper function to get alert configuration
async function getAlertConfiguration(supabase: any): Promise<{ criticalStock: boolean; manualAdjustment: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('configuracion_alertas')
      .select('alerta_stock_critico_activada, alerta_ajuste_manual_activada')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching alert configuration:', error);
      return null;
    }

    return {
      criticalStock: data.alerta_stock_critico_activada,
      manualAdjustment: data.alerta_ajuste_manual_activada
    };
  } catch (error) {
    console.error('Error in getAlertConfiguration:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('=== PROCESSING INVENTORY ALERT ===');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestBody = await req.json();
    console.log('Received alert request:', JSON.stringify(requestBody, null, 2));
    
    const { alert_type, data: alertData } = requestBody;

    if (!alert_type || !alertData) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          required: ["alert_type", "data"]
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Get alert configuration from database
    const alertConfig = await getAlertConfiguration(supabase);
    
    if (!alertConfig) {
      console.error('Failed to load alert configuration');
      return new Response(
        JSON.stringify({ 
          error: "Failed to load alert configuration"
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Alert configuration loaded:', alertConfig);

    // Process different alert types
    if (alert_type === 'critical_stock') {
      // Check if critical stock alerts are enabled
      if (!alertConfig.criticalStock) {
        console.log('Critical stock alerts are disabled, skipping...');
        return new Response(
          JSON.stringify({ 
            message: "Critical stock alerts are disabled",
            alert_sent: false
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Process critical stock alert
      const { inventory } = alertData as { inventory: InventoryItem[] };
      
      if (!inventory || !Array.isArray(inventory)) {
        return new Response(
          JSON.stringify({ error: "Invalid inventory data for critical stock alert" }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Find products in critical state
      const criticalProducts = inventory.filter(item => item.stock_total <= item.stock_minimo);
      
      if (criticalProducts.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: "No products in critical state",
            alert_sent: false
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Create critical stock alert payload
      const criticalStockAlert: CriticalStockAlert = {
        tipo_alerta: "alerta_stock_critico",
        timestamp: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        productos_criticos: criticalProducts.map(item => ({
          producto: item.producto,
          stock_actual: item.stock_total,
          stock_minimo: item.stock_minimo,
          stock_optimo: item.stock_optimo,
          cantidad_a_comprar: item.stock_optimo - item.stock_total
        }))
      };

      // Send webhook
      const webhookResult = await sendAlertWebhook(criticalStockAlert);
      
      return new Response(
        JSON.stringify({
          success: true,
          alert_type: 'critical_stock',
          products_alerted: criticalProducts.length,
          webhook_sent: webhookResult.success,
          webhook_error: webhookResult.error || null
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

    } else if (alert_type === 'manual_adjustment') {
      // Check if manual adjustment alerts are enabled
      if (!alertConfig.manualAdjustment) {
        console.log('Manual adjustment alerts are disabled, skipping...');
        return new Response(
          JSON.stringify({ 
            message: "Manual adjustment alerts are disabled",
            alert_sent: false
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Process manual adjustment alert
      const { transaction } = alertData as { transaction: TransactionData };
      
      if (!transaction || transaction.movimiento.operacion !== 'ajuste_inventario') {
        return new Response(
          JSON.stringify({ error: "Invalid transaction data for manual adjustment alert" }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Create manual adjustment alert payload
      const manualAdjustmentAlert: ManualAdjustmentAlert = {
        tipo_alerta: "alerta_ajuste_stock",
        transaccion: {
          ID_transaccion: transaction.ID_transaccion,
          id_venta: transaction.id_venta,
          id_usuario: transaction.id_usuario,
          tipo_transaccion: "Ajuste Manual",
          timestamp: transaction.timestamp.split('T')[0], // YYYY-MM-DD format
          producto: {
            nombre: transaction.producto.nombre,
            destilado: transaction.producto.destilado
          },
          movimiento: {
            ...(transaction.movimiento.cantidad_unidades !== undefined && {
              cantidad_unidades: transaction.movimiento.cantidad_unidades
            }),
            ...(transaction.movimiento.cantidad_ml !== undefined && {
              cantidad_ml: transaction.movimiento.cantidad_ml
            }),
            operacion: transaction.movimiento.operacion,
            origen: transaction.movimiento.origen,
            destino: transaction.movimiento.destino
          },
          valores: {
            costo_transaccion: transaction.valores.costo_transaccion
          }
        }
      };

      // Send webhook
      const webhookResult = await sendAlertWebhook(manualAdjustmentAlert);
      
      return new Response(
        JSON.stringify({
          success: true,
          alert_type: 'manual_adjustment',
          transaction_id: transaction.ID_transaccion,
          webhook_sent: webhookResult.success,
          webhook_error: webhookResult.error || null
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

    } else {
      return new Response(
        JSON.stringify({ 
          error: "Invalid alert type",
          supported_types: ["critical_stock", "manual_adjustment"]
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

  } catch (error) {
    console.error('CRITICAL ERROR in inventory-alerts function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});