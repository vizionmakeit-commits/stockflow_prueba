import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- INTERFACES ---
interface IncomingSaleConcept { IdProducto: string; Cantidad: number; Precio: number; }
interface IncomingSale { NumeroOrden: string; Total: number; FechaVenta: string; Conceptos: IncomingSaleConcept[]; }
interface SalesPayload { Ventas: IncomingSale[]; }
interface DatabaseProduct { id: string; nombre: string; destilado: string | null; departamento: string | null; costo_unitario: number; capacidad_ml_por_unidad: number; es_receta: boolean; seguimiento_stock: boolean; recipe_id: number | null; }
interface RecipeIngredient { product_name: string; destilado_name: string; quantity_ml: number; costo: number; }
interface TransactionPayload { tipo_transaccion: string; timestamp: string; id_usuario: string; id_venta?: string; origen: { tipo: string; nombre: string; }; producto: { nombre: string; destilado: string; }; movimiento: { cantidad_unidades?: number; cantidad_ml?: number; operacion: string; movimiento_unidad: string; origen: string | null; destino: string; }; valores: { costo_transaccion: number; }; }
interface ProcessedSaleResult { sale_id: string; external_order_id: string; status: 'exitoso' | 'fallido' | 'parcial'; errors: string[]; }


function validateSalesPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || !Array.isArray(payload.Ventas) || payload.Ventas.length === 0) { return { valid: false, error: "El payload debe contener un array 'Ventas' no vacío." }; }
  for (const [i, sale] of payload.Ventas.entries()) {
    if (!sale.NumeroOrden || !sale.FechaVenta || typeof sale.Total !== 'number' || !Array.isArray(sale.Conceptos) || sale.Conceptos.length === 0) { return { valid: false, error: `La venta en el índice ${i} tiene campos faltantes o inválidos.` }; }
    for (const [j, concept] of sale.Conceptos.entries()) {
      if (!concept.IdProducto || typeof concept.Cantidad !== 'number' || concept.Cantidad <= 0) { return { valid: false, error: `El concepto en el índice ${j} de la venta ${i} es inválido.` }; }
    }
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const salesPayload: SalesPayload = await req.json();
    const validation = validateSalesPayload(salesPayload);
    if (!validation.valid) { return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const processingResults: ProcessedSaleResult[] = [];

    for (const sale of salesPayload.Ventas) {
      const result: ProcessedSaleResult = { sale_id: '', external_order_id: sale.NumeroOrden, status: 'parcial', errors: [] };

      try {
        const { data: saleRecord, error: saleError } = await supabaseClient.from('ventas').insert({ id_externo_venta: sale.NumeroOrden, fecha_venta: sale.FechaVenta, total: sale.Total, json_original: sale }).select('id').single();
        if (saleError) throw new Error(`Error al crear el registro de venta: ${saleError.message}`);
        
        result.sale_id = saleRecord.id;
        let allConceptsSucceeded = true;
        
        for (const concept of sale.Conceptos) {
          try {
            const { data: product, error: productError } = await supabaseClient.from('productos').select('*').eq('id_producto_externo', concept.IdProducto).single();
            if (productError) throw new Error(`Producto con ID externo ${concept.IdProducto} no encontrado.`);

            const transactionPayloads: TransactionPayload[] = [];
            
            if (product.es_receta) {
              if (!product.recipe_id) throw new Error(`El producto ${product.nombre} es receta pero no está enlazado a una.`);
              const { data: ingredients, error: ingredientsError } = await supabaseClient.from('recipe_ingredients').select('product_name, destilado_name, quantity_ml, costo').eq('recipe_id', product.recipe_id);
              if (ingredientsError || !ingredients || ingredients.length === 0) throw new Error(`Ingredientes para la receta ${product.nombre} no encontrados.`);
              
              const ingredientNames = ingredients.map(i => i.product_name);
              const { data: ingredientProducts, error: ingProductsError } = await supabaseClient.from('productos').select('*').in('nombre', ingredientNames);
              if (ingProductsError) throw new Error(`Error al buscar costos de ingredientes para ${product.nombre}.`);
              const ingredientMap = new Map(ingredientProducts.map(p => [p.nombre, p]));

              for (const ingredient of ingredients) {
                const ingProduct = ingredientMap.get(ingredient.product_name);
                let cost = 0;
                
                if (ingProduct) { 
                  cost = (ingProduct.costo_unitario / (ingProduct.capacidad_ml_por_unidad || 1)) * (ingredient.quantity_ml * concept.Cantidad);
                  if (ingProduct.seguimiento_stock) {
                     transactionPayloads.push({
                      tipo_transaccion: 'Venta_Externa', timestamp: sale.FechaVenta, id_usuario: 'sistema_ventas', id_venta: result.sale_id,
                      origen: { tipo: 'receta', nombre: product.nombre },
                      producto: { nombre: ingredient.product_name, destilado: ingProduct.destilado || ingredient.destilado_name },
                      movimiento: { cantidad_ml: ingredient.quantity_ml * concept.Cantidad, operacion: 'salida_stock', movimiento_unidad: 'ml', origen: null, destino: 'barra' },
                      valores: { costo_transaccion: cost },
                    });
                  }
                }
              }
            } else { // Producto Simple
              if (product.seguimiento_stock) {
                transactionPayloads.push({
                  tipo_transaccion: 'Venta_Externa', timestamp: sale.FechaVenta, id_usuario: 'sistema_ventas', id_venta: result.sale_id,
                  origen: { tipo: 'producto_simple', nombre: product.nombre },
                  producto: { nombre: product.nombre, destilado: product.destilado || 'N/A' },
                  movimiento: { cantidad_unidades: concept.Cantidad, operacion: 'salida_stock', movimiento_unidad: 'unidades', origen: null, destino: 'barra' },
                  valores: { costo_transaccion: product.costo_unitario * concept.Cantidad },
                });
              }
            }
            
            if (transactionPayloads.length > 0) {
              const { error: processError } = await supabaseClient.functions.invoke('process-transaction', { body: transactionPayloads });
              if (processError) throw new Error(`La llamada a process-transaction falló: ${processError.message}`);
            }

          } catch (conceptError) {
            allConceptsSucceeded = false;
            result.errors.push(`Error en concepto ${concept.IdProducto}: ${conceptError.message}`);
          }
        }
        
        result.status = allConceptsSucceeded ? 'exitoso' : 'parcial';
      } catch (saleError) {
        result.status = 'fallido';
        result.errors.push(saleError.message);
      }
      
      processingResults.push(result);
    }
    
    return new Response(JSON.stringify({ message: 'Procesamiento de lote completado.', results: processingResults }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Error interno del servidor: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});