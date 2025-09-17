import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

async function forwardToN8n(transactions: any[]) {
  if (!N8N_WEBHOOK_URL) {
    console.warn("N8N_WEBHOOK_URL no configurada. Saltando envío a n8n.");
    return;
  }
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactions),
    });
    console.log(`${transactions.length} transacciones enviadas a n8n.`);
  } catch (error) {
    console.error("Error al enviar a n8n:", error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const payload = await req.json();
    const transactionBatch = Array.isArray(payload) ? payload : [payload];

    if (transactionBatch.length === 0) {
      return new Response(JSON.stringify({ message: "No hay transacciones para procesar." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const transactionsToInsert = transactionBatch.map(tx => ({
      timestamp: tx.timestamp,
      tipo_transaccion: tx.tipo_transaccion,
      id_usuario: tx.id_usuario,
      id_venta: tx.id_venta || null,
      origen_tipo: tx.origen?.tipo,
      origen_nombre: tx.origen?.nombre,
      producto_nombre: tx.producto.nombre,
      producto_destilado: tx.producto.destilado,
      movimiento_cantidad: tx.movimiento.cantidad_ml ?? tx.movimiento.cantidad_unidades,
      movimiento_unidad: tx.movimiento.movimiento_unidad,
      operacion: tx.movimiento.operacion,
      origen_movimiento: tx.movimiento.origen,
      destino_movimiento: tx.movimiento.destino,
      costo_transaccion: tx.valores.costo_transaccion || 0,
    }));

    const { data: insertedData, error } = await supabaseClient.from('transacciones').insert(transactionsToInsert).select();
    if (error) { throw new Error(`Error en inserción de base de datos: ${error.message}`); }

    forwardToN8n(insertedData);
    
    return new Response(JSON.stringify(insertedData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});