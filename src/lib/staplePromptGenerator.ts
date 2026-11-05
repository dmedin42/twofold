import { InventoryItem } from '@/types/household';
import { getDaysUntilExpiry } from '@/data/expiryUtils';

interface MealSuggestion {
  name: string;
  use_up: string[];
  rebuy: string[];
}

/**
 * Generates an AI-ready prompt focused on frequent staples expiring soon
 * and items that have run out.
 */
export function generateStapleMealPrompt(
  expiringStaples: InventoryItem[],
  goneStaples: InventoryItem[],
  userPreferences = 'Brazilian-style dishes and American comfort food'
): string {
  const expiringList = expiringStaples
    .map(item => `${item.name} (${getDaysUntilExpiry(item.expiryDate)} days left, ${item.quantity} ${item.unit})`)
    .join(', ');

  const goneList = goneStaples
    .map(item => item.name)
    .join(', ');

  return `I have these FREQUENTLY USED items expiring in 48 hours: [${expiringList || 'None'}].

I also have these items that just ran out: [${goneList || 'None'}].

Based on my preference for ${userPreferences}, suggest 2 meals I can make right now to use up the expiring items.

For each meal, return:
- 'name': (Dish name)
- 'use_up': (Which expiring items are used?)
- 'rebuy': (Which 'Gone' staples do I need to restock to finish this?)

Format as JSON only. Example:
[
  {"name": "Chicken Stroganoff", "use_up": ["Chicken Breast", "Heavy Cream"], "rebuy": ["Milk", "Butter"]},
  {"name": "Veggie Omelette", "use_up": ["Eggs", "Bell Peppers"], "rebuy": []}
]`;
}

/**
 * Checks if we should show a meal suggestion notification
 * Rule: Only notify if at least 2 frequent staples are expiring
 */
export function shouldShowMealSuggestion(expiringStaples: InventoryItem[]): boolean {
  return expiringStaples.length >= 2;
}

/**
 * Categorizes inventory items for the Check In staple alert view
 */
export interface StapleAlertItem {
  item: InventoryItem;
  status: 'gone' | 'expiring' | 'ok';
  alertType: 'auto_grocery' | 'meal_suggestion' | 'none';
  daysUntilExpiry: number;
}

export function categorizeForStapleAlerts(
  inventory: InventoryItem[],
  expiryThresholdDays = 2
): StapleAlertItem[] {
  return inventory.map(item => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
    
    // Gone items (qty = 0)
    if (item.quantity <= 0) {
      return {
        item,
        status: 'gone' as const,
        alertType: item.isFrequentStaple ? 'auto_grocery' as const : 'none' as const,
        daysUntilExpiry,
      };
    }
    
    // Expiring items (within threshold)
    if (daysUntilExpiry <= expiryThresholdDays && daysUntilExpiry >= 0) {
      return {
        item,
        status: 'expiring' as const,
        alertType: item.isFrequentStaple ? 'meal_suggestion' as const : 'none' as const,
        daysUntilExpiry,
      };
    }
    
    // Everything else
    return {
      item,
      status: 'ok' as const,
      alertType: 'none' as const,
      daysUntilExpiry,
    };
  }).sort((a, b) => {
    // Sort by urgency: gone first, then expiring, then ok
    const statusOrder = { gone: 0, expiring: 1, ok: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Within same status, sort by days until expiry
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });
}
