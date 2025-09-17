// Service for fetching products data from Google Sheets
// URL: https://sheets.googleapis.com/v4/spreadsheets/1XNjSzzysQnolmmyf7pCb1E6PqeyJfUkqmAOGlePyDmw/values/Productos!A:F?key=AIzaSyDC5O_2FjHqAFvFsNgZtlKVecVsDGQFFww

export interface ProductItem {
  destilado: string;
  producto: string;
}

const PRODUCTS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets/1XNjSzzysQnolmmyf7pCb1E6PqeyJfUkqmAOGlePyDmw/values/Productos!A:F?key=AIzaSyDC5O_2FjHqAFvFsNgZtlKVecVsDGQFFww';

export const fetchProductsData = async (): Promise<ProductItem[]> => {
  try {
    console.log('🔄 Fetching products data from Google Sheets API...');
    console.log('📍 API URL:', PRODUCTS_API_URL);
    
    const response = await fetch(PRODUCTS_API_URL, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    console.log('📊 Products API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    console.log('📦 Raw API response:', jsonData);
    
    // Parse Google Sheets API response
    if (!jsonData.values || jsonData.values.length === 0) {
      throw new Error('No products data found in the sheet');
    }
    
    // Skip header row (first row)
    const dataRows = jsonData.values.slice(1);
    console.log('📋 Data rows found:', dataRows.length);
    const products: ProductItem[] = [];
    
    for (const row of dataRows) {
      console.log('🔍 Processing row:', row);
      if (row.length >= 2 && row[0]?.trim() && row[1]?.trim()) {
        const product: ProductItem = {
          destilado: row[0].trim(),
          producto: row[1].trim()
        };
        products.push(product);
        console.log('✅ Added product:', product);
      }
    }
    
    console.log('🎯 Final parsed products:', products.length, 'items');
    console.log('📝 Products list:', products);
    return products;
    
  } catch (error) {
    console.error('❌ Error fetching products data from Google Sheets:', error);
    // Return empty array as fallback
    return [];
  }
};