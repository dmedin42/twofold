import { InventoryItem } from '@/types/household';
import { RecipeFilterType, RECIPE_FILTERS } from '@/types/recipe';
import { getDaysUntilExpiry } from '@/data/expiryUtils';

interface BridgePromptOptions {
  selectedFilters: RecipeFilterType[];
  requestedServings: number;
  expiringItems: InventoryItem[];
  pantryItems: InventoryItem[];
  customFilterText?: string;
}

/**
 * Generates the universal bridge prompt for external AI
 */
export function generateBridgePrompt(options: BridgePromptOptions): string {
  const { selectedFilters, requestedServings, expiringItems, pantryItems, customFilterText } = options;

  // Build filter types string
  const filterLabels = selectedFilters
    .map(id => RECIPE_FILTERS.find(f => f.id === id)?.label)
    .filter(Boolean);
  
  // Add custom text if provided
  if (customFilterText?.trim()) {
    filterLabels.push(customFilterText.trim());
  }
  
  const filterTypes = filterLabels.length > 0 ? filterLabels.join(', ') : 'balanced';

  // Build filter injections
  const filterInjections = selectedFilters
    .map(id => RECIPE_FILTERS.find(f => f.id === id)?.promptInjection)
    .filter(Boolean)
    .join(' ');

  // Add custom injection if provided
  const customInjection = customFilterText?.trim()
    ? ` Additional preference: ${customFilterText.trim()}.`
    : '';

  // Build expiring items list
  const expiringStaplesList = expiringItems
    .map(item => `${item.name} (${getDaysUntilExpiry(item.expiryDate)} days left)`)
    .join(', ') || 'None';

  // Build pantry list with atomic units (exclude items with qty <= 0)
  const pantryList = pantryItems
    .filter(item => item.quantity > 0)
    .map(item => `${item.name} (${item.quantity} ${item.unit})`)
    .join(', ') || 'None';

  return `I want to cook a [${filterTypes}] meal.${filterInjections ? ` ${filterInjections}` : ''}${customInjection}

IMPORTANT: Create a cohesive, well-balanced meal that a normal person would actually want to eat. Be resourceful with the available ingredients—prioritize using what's on hand to make a satisfying, complete dish. Don't suggest bizarre combinations; think like a home cook making dinner.

Pantry Context (ATOMIC UNITS):
- Expiring items (USE THESE FIRST): [${expiringStaplesList}]
- Available items: [${pantryList}]

Instructions:
1. Suggest a practical, delicious recipe that prioritizes expiring items.
2. Use available pantry items creatively to make a complete, satisfying meal.
3. Match ingredient quantities to what's actually available (e.g., if I have 8 eggs, don't request 12).
4. Format the response as a JSON object with:
   - title: (Dish Name)
   - servings: ${requestedServings}
   - ingredients: [{"item": "name", "qty": 2, "unit": "count"}] (use atomic units: count, sticks, cups, etc.)
   - instructions: ["Step 1", "Step 2", "Step 3"]
   - metrics: {"prep_time": 10, "cook_time": 20, "protein": "chicken"}

UNIT RULES for ingredients:
- Eggs: use "count" (e.g., {"item": "Eggs", "qty": 3, "unit": "count"})
- Butter: use "sticks" (1 stick = 1/4 lb)
- Liquids: use "cups", "tbsp", "tsp", or "gallons"
- Meat/Produce: use "lbs", "oz", or "count"

Return ONLY the JSON.`;
}

/**
 * Copies the bridge prompt to clipboard and returns success status
 */
export async function copyPromptToClipboard(prompt: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(prompt);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Gets items expiring within the specified number of days
 */
export function getExpiringItems(inventory: InventoryItem[], withinDays = 5): InventoryItem[] {
  return inventory
    .filter(item => {
      const daysLeft = getDaysUntilExpiry(item.expiryDate);
      return daysLeft >= 0 && daysLeft <= withinDays && item.quantity > 0;
    })
    .sort((a, b) => getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate));
}

/**
 * Gets the top N expiring items for display
 */
export function getTopExpiringItems(inventory: InventoryItem[], count = 3): InventoryItem[] {
  return getExpiringItems(inventory).slice(0, count);
}
