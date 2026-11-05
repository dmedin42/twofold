import { InventoryItem } from '@/types/household';
import { StagedRecipeIngredient } from '@/types/recipe';
import { areUnitsCompatible, convertUnits, normalizeUnit } from '@/lib/atomicUnits';

// Categories considered perishable (can be deducted from pantry)
export const PERISHABLE_CATEGORIES = ['Meat', 'Dairy', 'Produce', 'Bakery', 'Frozen', 'Beverages'] as const;

// Categories that are shelf-stable (should NOT be deducted)
export const SHELF_STABLE_CATEGORIES = ['Pantry', 'Snacks', 'Other'] as const;

export interface PantryMatchResult {
  ingredient: StagedRecipeIngredient;
  matchedItem: InventoryItem | null;
  isInPantry: boolean;
  isPerishable: boolean;
  availableQty: number;
  availableInRecipeUnits: number; // Converted to recipe's unit system
  hasEnough: boolean;
}

/**
 * Match recipe ingredients against pantry inventory
 */
export function matchIngredientsToInventory(
  ingredients: StagedRecipeIngredient[],
  inventory: InventoryItem[]
): PantryMatchResult[] {
  return ingredients.map(ing => {
    // Find matching pantry item (fuzzy match on name)
    const matchedItem = inventory.find(item => {
      const ingName = ing.item.toLowerCase().trim();
      const itemName = item.name.toLowerCase().trim();
      return itemName.includes(ingName) || ingName.includes(itemName);
    });

    const isPerishable = matchedItem 
      ? PERISHABLE_CATEGORIES.includes(matchedItem.category as typeof PERISHABLE_CATEGORIES[number])
      : false;

    // Calculate available quantity in recipe's unit system
    let availableInRecipeUnits = matchedItem?.quantity || 0;
    if (matchedItem) {
      const itemUnit = normalizeUnit(matchedItem.unit || 'count');
      const recipeUnit = normalizeUnit(ing.unit || 'count');
      
      if (itemUnit !== recipeUnit && areUnitsCompatible(itemUnit, recipeUnit)) {
        const converted = convertUnits(matchedItem.quantity, itemUnit, recipeUnit);
        if (converted !== null) {
          availableInRecipeUnits = converted;
        }
      }
    }

    return {
      ingredient: ing,
      matchedItem: matchedItem || null,
      isInPantry: !!matchedItem && matchedItem.quantity > 0,
      isPerishable,
      availableQty: matchedItem?.quantity || 0,
      availableInRecipeUnits,
      hasEnough: availableInRecipeUnits >= ing.qty,
    };
  });
}

/**
 * Get only perishable ingredients that should be deducted
 */
export function getPerishableIngredients(
  ingredients: StagedRecipeIngredient[],
  inventory: InventoryItem[]
): { ingredient: StagedRecipeIngredient; pantryItem: InventoryItem }[] {
  const matches = matchIngredientsToInventory(ingredients, inventory);
  
  return matches
    .filter(m => m.matchedItem && m.isPerishable && m.isInPantry)
    .map(m => ({
      ingredient: m.ingredient,
      pantryItem: m.matchedItem!,
    }));
}

/**
 * Check how many ingredients are available in pantry
 */
export function getPantryAvailability(
  ingredients: StagedRecipeIngredient[],
  inventory: InventoryItem[]
): { available: number; total: number; percentage: number } {
  const matches = matchIngredientsToInventory(ingredients, inventory);
  const available = matches.filter(m => m.isInPantry).length;
  const total = ingredients.length;
  
  return {
    available,
    total,
    percentage: total > 0 ? Math.round((available / total) * 100) : 0,
  };
}
