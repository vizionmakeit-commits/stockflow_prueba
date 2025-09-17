import { InventoryItem } from '../types/inventory';

export class StockAlertService {
  private lastCriticalAlertCheck: Map<string, number> = new Map();

  constructor() {
    // Alert configuration is managed by database
    // This service handles automatic alert triggers
  }

  // Check if product has entered critical state (not just is critical)
  private hasEnteredCriticalState(item: InventoryItem, productKey: string): boolean {
    const now = Date.now();
    const lastAlert = this.lastCriticalAlertCheck.get(productKey) || 0;
    const hoursSinceLastAlert = (now - lastAlert) / (1000 * 60 * 60);
    
    // Only alert if:
    // 1. Product is currently in critical state (stock_total <= stock_minimo)
    // 2. Haven't alerted for this product in the last 24 hours
    return item.stock_total <= item.stock_minimo && hoursSinceLastAlert >= 24;
  }

  async checkAndSendAlerts(inventory: InventoryItem[]): Promise<void> {
    console.log('🔍 Checking for products that have ENTERED critical state...');
    
    // Find products that have ENTERED critical state (not just are critical)
    const newlyCriticalItems = inventory.filter(item => {
      const productKey = `${item.destilado}-${item.producto}`;
      return this.hasEnteredCriticalState(item, productKey);
    });
    
    if (newlyCriticalItems.length === 0) {
      console.log('✅ No products have newly entered critical state');
      return;
    }

    console.log(`🚨 ${newlyCriticalItems.length} products have ENTERED critical state, sending automatic alert...`);

    try {
      // Send automatic critical stock alert
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inventory-alerts`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'critical_stock',
          data: {
            inventory: newlyCriticalItems
          }
        })
      });

      if (response.ok) {
        // Mark products as alerted to prevent duplicate alerts
        const now = Date.now();
        newlyCriticalItems.forEach(item => {
          const productKey = `${item.destilado}-${item.producto}`;
          this.lastCriticalAlertCheck.set(productKey, now);
        });

        console.log(`✅ AUTOMATIC critical stock alert sent for ${newlyCriticalItems.length} products`);
      } else {
        console.error('❌ Failed to send automatic critical stock alert:', response.status);
      }
    } catch (error) {
      console.error('❌ Error sending automatic critical stock alert:', error);
    }
  }

  // Force send alerts (for testing - ignores 24-hour limit)
  async forceSendAlerts(inventory: InventoryItem[]): Promise<void> {
    console.log('🧪 FORCE sending critical stock alerts for testing...');
    const criticalItems = inventory.filter(item => item.stock_total <= item.stock_minimo);
    
    if (criticalItems.length === 0) {
      console.log('⚠️ No critical items found for force alert test');
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inventory-alerts`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'critical_stock',
          data: {
            inventory: criticalItems
          }
        })
      });

      if (response.ok) {
        console.log(`✅ FORCE alert sent for ${criticalItems.length} critical products`);
      }
    } catch (error) {
      console.error('❌ Error sending force alert:', error);
    }
  }
}