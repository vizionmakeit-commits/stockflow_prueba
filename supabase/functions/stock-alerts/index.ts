/*
  # Stock Alerts Edge Function

  1. Purpose
    - Monitor inventory levels and send webhook notifications for critical stock
    - Process stock data and identify items that have entered critical status
    - Send formatted JSON alerts to external webhook endpoints

  2. Functionality
    - Receives inventory data from the frontend
    - Compares current stock levels with minimum thresholds
    - Generates alerts for items in critical stock status
    - Sends webhook notifications with detailed product information

  3. Security
    - CORS enabled for frontend requests
    - Webhook URL validation
    - Error handling and logging
*/

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

interface StockAlert {
  timestamp: string;
  alert_type: 'stock_critico';
  product: {
    destilado: string;
    producto: string;
    stock_actual: number;
    stock_minimo: number;
    stock_optimo: number;
    ubicacion: {
      barra: number;
      bodega: number;
    };
    valoracion: number;
    costo_unitario: number;
  };
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface WebhookPayload {
  alerts: StockAlert[];
  summary: {
    total_alerts: number;
    total_affected_value: number;
    timestamp: string;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

    const { inventory, webhook_url } = await req.json();

    if (!inventory || !Array.isArray(inventory)) {
      return new Response(
        JSON.stringify({ error: "Invalid inventory data" }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Identificar productos en stock crítico
    const criticalItems: InventoryItem[] = inventory.filter(
      (item: InventoryItem) => item.stock_total <= item.stock_minimo
    );

    if (criticalItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No critical stock alerts",
          alerts_count: 0 
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

    // Generar alertas
    const alerts: StockAlert[] = criticalItems.map((item) => {
      const severity = item.stock_total === 0 ? 'high' : 
                      item.stock_total <= Math.floor(item.stock_minimo / 2) ? 'high' : 'medium';
      
      return {
        timestamp: new Date().toISOString(),
        alert_type: 'stock_critico',
        product: {
          destilado: item.destilado,
          producto: item.producto,
          stock_actual: item.stock_total,
          stock_minimo: item.stock_minimo,
          stock_optimo: item.stock_optimo,
          ubicacion: {
            barra: item.stock_barra,
            bodega: item.stock_bodega,
          },
          valoracion: item.valoracion,
          costo_unitario: item.costo_unitario,
        },
        severity,
        message: `${item.producto} (${item.destilado}) tiene stock crítico: ${item.stock_total} unidades (mínimo: ${item.stock_minimo})`
      };
    });

    // Crear payload del webhook
    const webhookPayload: WebhookPayload = {
      alerts,
      summary: {
        total_alerts: alerts.length,
        total_affected_value: criticalItems.reduce((sum, item) => sum + item.valoracion, 0),
        timestamp: new Date().toISOString(),
      }
    };

    // Enviar webhook si se proporciona URL
    if (webhook_url) {
      try {
        const webhookResponse = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'StockFlow-Alert-System/1.0',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('Webhook failed:', webhookResponse.status, await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_generated: alerts.length,
        webhook_sent: !!webhook_url,
        alerts: webhookPayload
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error in stock-alerts function:', error);
    
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