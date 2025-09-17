import { InventoryItem } from '../types/inventory';

// Updated URL for the new Google Sheets API
const SHEET_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets/1XNjSzzysQnolmmyf7pCb1E6PqeyJfUkqmAOGlePyDmw/values/Bolt!A:L?key=AIzaSyDC5O_2FjHqAFvFsNgZtlKVecVsDGQFFww';

export const fetchInventoryData = async (): Promise<InventoryItem[]> => {
  try {
    console.log('Fetching inventory data from Google Sheets API...');
    
    const response = await fetch(SHEET_API_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    console.log('Google Sheets API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    console.log('Google Sheets data received, processing...');
    
    // Parse Google Sheets API response
    if (!jsonData.values || jsonData.values.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    // Skip header row (first row)
    const dataRows = jsonData.values.slice(1);
    const data: InventoryItem[] = [];
    
    for (const row of dataRows) {
      // Each row is already an array of values from the API
      const values = row;
      
      if (values.length >= 7 && values[0]?.trim()) {
        try {
          // Parse columns A-G for Dashboard functionality
          const item: InventoryItem = {
            destilado: values[0]?.trim() || '',
            producto: values[1]?.trim() || '',
            stock_barra: parseFloat(values[2]?.replace(/[^\d.-]/g, '') || '0') || 0,
            stock_bodega: parseFloat(values[3]?.replace(/[^\d.-]/g, '') || '0') || 0,
            stock_total: parseFloat(values[4]?.replace(/[^\d.-]/g, '') || '0') || 0,
            costo_unitario: parseFloat(values[5]?.replace(/[^\d.-]/g, '') || '0') || 0,
            valoracion: parseFloat(values[6]?.replace(/[^\d.-]/g, '') || '0') || 0,
            // Columns H-J are reserved for future operations (parsed but not processed)
            // Column K: stock_minimo, Column L: stock_optimo
            stock_minimo: values.length >= 11 && values[10] ? 
              parseFloat(values[10]?.replace(/[^\d.-]/g, '') || '0') || 3 : 3,
            stock_optimo: values.length >= 12 && values[11] ? 
              parseFloat(values[11]?.replace(/[^\d.-]/g, '') || '0') || 8 : 8
          };
          
          // Validate that we have at least the essential data
          if (item.destilado && item.producto) {
            data.push(item);
          }
        } catch (error) {
          console.warn('Error parsing row:', values, error);
        }
      }
    }
    
    if (data.length === 0) {
      console.warn('No valid inventory data found, using mock data');
      return getMockData();
    }
    
    console.log('Successfully parsed', data.length, 'inventory items');
    return data;
  } catch (error) {
    console.error('Error fetching inventory data from Google Sheets:', error);
    // Return mock data as fallback
    return getMockData();
  }
};

// Mock data for development and fallback
const getMockData = (): InventoryItem[] => [
  {
    destilado: 'Whisky',
    producto: 'Johnnie Walker Black Label',
    stock_barra: 3,
    stock_bodega: 8,
    stock_total: 11,
    costo_unitario: 45.50,
    valoracion: 500.50,
    stock_minimo: 3,
    stock_optimo: 8
  },
  {
    destilado: 'Ron',
    producto: 'Bacardi Blanco',
    stock_barra: 2,
    stock_bodega: 12,
    stock_total: 14,
    costo_unitario: 28.75,
    valoracion: 402.50,
    stock_minimo: 4,
    stock_optimo: 10
  },
  {
    destilado: 'Vodka',
    producto: 'Absolut Original',
    stock_barra: 5,
    stock_bodega: 6,
    stock_total: 11,
    costo_unitario: 32.00,
    valoracion: 352.00,
    stock_minimo: 3,
    stock_optimo: 8
  },
  {
    destilado: 'Tequila',
    producto: 'Don Julio Blanco',
    stock_barra: 1,
    stock_bodega: 4,
    stock_total: 5,
    costo_unitario: 65.00,
    valoracion: 325.00,
    stock_minimo: 2,
    stock_optimo: 6
  },
  {
    destilado: 'Gin',
    producto: 'Bombay Sapphire',
    stock_barra: 4,
    stock_bodega: 8,
    stock_total: 12,
    costo_unitario: 38.25,
    valoracion: 459.00,
    stock_minimo: 4,
    stock_optimo: 10
  },
  {
    destilado: 'Whisky',
    producto: 'Chivas Regal 12',
    stock_barra: 2,
    stock_bodega: 5,
    stock_total: 7,
    costo_unitario: 52.00,
    valoracion: 364.00,
    stock_minimo: 2,
    stock_optimo: 6
  },
  {
    destilado: 'Brandy',
    producto: 'Hennessy VS',
    stock_barra: 1,
    stock_bodega: 3,
    stock_total: 4,
    costo_unitario: 78.00,
    valoracion: 312.00,
    stock_minimo: 1,
    stock_optimo: 4
  },
  {
    destilado: 'Whisky',
    producto: 'Macallan 12',
    stock_barra: 0,
    stock_bodega: 2,
    stock_total: 2,
    costo_unitario: 120.00,
    valoracion: 240.00,
    stock_minimo: 1,
    stock_optimo: 4
  }
];