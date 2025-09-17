export interface InventoryItem {
  destilado: string;
  producto: string;
  stock_barra: number;
  stock_bodega: number;
  stock_terraza: number;
  stock_total: number;
  costo_unitario: number;
  valoracion: number;
  stock_minimo: number;
  stock_optimo: number;
}

export interface FilterState {
  destilado: string;
  producto: string;
  ubicacion: string;
}