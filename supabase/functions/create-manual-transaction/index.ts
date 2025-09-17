/*
  # Create Manual Transaction Edge Function

  ## Purpose
  Secure endpoint for processing manual transactions from the frontend.
  Acts as a validation layer before calling the existing process-transaction function.

  ## Security Features
  - Input validation and sanitization
  - Proper error handling and logging
  - CORS support for frontend requests
  - Structured response format

  ## API Endpoints
  - POST /create-manual-transaction: Process single or multiple transactions
  - OPTIONS /create-manual-transaction: CORS preflight handling

  ## Request Format
  Single transaction:
  {
    "tipo_transaccion": "Update_Unidades",
    "timestamp": "2025-01-XX...",
    "id_usuario": "user_id",
    "origen": { "tipo": "manual", "nombre": "Update_Unidades" },
    "producto": { "nombre": "Product Name", "destilado": "Whisky" },
    "movimiento": { ... },
    "valores": { "costo_transaccion": 100.50 }
  }

  Array of transactions:
  [{ transaction1 }, { transaction2 }, ...]

  ## Response Format
  Success: { success: true, transactions: [...], message: "..." }
  Error: { success: false, error: "...", details: "..." }
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Interface for transaction payload validation
interface TransactionPayload {
  tipo_transaccion: string;
  timestamp: string;
  id_usuario: string;
  id_venta?: string;
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

// Validate single transaction payload
function validateTransactionPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload structure' };
  }

  // Required fields validation
  const requiredFields = ['tipo_transaccion', 'timestamp', 'id_usuario', 'origen', 'producto', 'movimiento', 'valores'];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate nested objects
  if (!payload.origen?.tipo || !payload.origen?.nombre) {
    return { valid: false, error: 'Invalid origen structure' };
  }

  if (!payload.producto?.nombre || !payload.producto?.destilado) {
    return { valid: false, error: 'Invalid producto structure' };
  }

  if (!payload.movimiento?.operacion || !payload.movimiento?.destino) {
    return { valid: false, error: 'Invalid movimiento structure' };
  }

  if (typeof payload.valores?.costo_transaccion !== 'number') {
    return { valid: false, error: 'Invalid valores structure' };
  }

  // Validate operation types
  const validOperations = ['entrada_stock', 'salida_stock', 'transferencia', 'ajuste_inventario'];
  if (!validOperations.includes(payload.movimiento.operacion)) {
    return { valid: false, error: `Invalid operation: ${payload.movimiento.operacion}` };
  }

  // Validate locations
  const validLocations = ['barra', 'bodega', 'terraza', 'cocina', 'almacen'];
  if (payload.movimiento.origen && !validLocations.includes(payload.movimiento.origen)) {
    return { valid: false, error: `Invalid origen location: ${payload.movimiento.origen}` };
  }
  
  if (!validLocations.includes(payload.movimiento.destino)) {
    return { valid: false, error: `Invalid destino location: ${payload.movimiento.destino}` };
  }

  return { valid: true };
}

// Validate request payload (single transaction or array)
function validateRequestPayload(payload: any): { valid: boolean; error?: string; transactions?: TransactionPayload[] } {
  if (!payload) {
    return { valid: false, error: 'Empty request payload' };
  }

  // Handle array of transactions
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return { valid: false, error: 'Empty transactions array' };
    }

    if (payload.length > 50) {
      return { valid: false, error: 'Too many transactions (max 50)' };
    }

    // Validate each transaction
    for (let i = 0; i < payload.length; i++) {
      const validation = validateTransactionPayload(payload[i]);
      if (!validation.valid) {
        return { valid: false, error: `Transaction ${i + 1}: ${validation.error}` };
      }
    }

    return { valid: true, transactions: payload };
  }

  // Handle single transaction
  const validation = validateTransactionPayload(payload);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true, transactions: [payload] };
}

Deno.serve(async (req: Request) => {
  try {
    console.log('=== CREATE MANUAL TRANSACTION FUNCTION CALLED ===');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.url);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('✈️ Handling CORS preflight request');
      return new Response('ok', {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Method not allowed',
          allowed_methods: ['POST', 'OPTIONS']
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request body received:', {
        type: Array.isArray(requestBody) ? 'array' : 'object',
        count: Array.isArray(requestBody) ? requestBody.length : 1
      });
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          details: error instanceof Error ? error.message : 'Unknown parsing error'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate request payload
    const validation = validateRequestPayload(requestBody);
    if (!validation.valid) {
      console.log('❌ Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Validation failed',
          details: validation.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const transactions = validation.transactions!;
    console.log('✅ Validation passed for', transactions.length, 'transactions');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error',
          details: 'Missing Supabase environment variables'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the existing process-transaction function
    console.log('🔄 Calling process-transaction function...');
    
    try {
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-transaction',
        {
          body: transactions
        }
      );

      if (processError) {
        console.error('❌ Error from process-transaction:', processError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Transaction processing failed',
            details: processError.message
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      console.log('✅ Transactions processed successfully:', processResult);

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: `${transactions.length} transaction(s) processed successfully`,
          transactions: processResult,
          count: transactions.length
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (error) {
      console.error('❌ Error calling process-transaction:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to process transactions',
          details: error instanceof Error ? error.message : 'Unknown processing error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR in create-manual-transaction:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Critical internal server error',
        details: error instanceof Error ? error.message : 'Unknown critical error',
        timestamp: new Date().toISOString()
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