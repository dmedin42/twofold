// Recipe Filter Types
export type RecipeFilterType = 
  | 'healthy'
  | 'quick'
  | 'reduce_waste'
  | 'one_pot'
  | 'crockpot'
  | 'instant_pot'
  | 'air_fryer'
  | 'meal_prep';

export interface RecipeFilter {
  id: RecipeFilterType;
  label: string;
  emoji: string;
  promptInjection: string;
}

export const RECIPE_FILTERS: RecipeFilter[] = [
  {
    id: 'healthy',
    label: 'Healthy',
    emoji: '🥗',
    promptInjection: 'Focus on high-protein, nutrient-dense ingredients. Avoid heavy processed oils or sugars. Create a balanced, wholesome meal that feels satisfying and nourishing.',
  },
  {
    id: 'quick',
    label: 'Quick & Easy',
    emoji: '⚡',
    promptInjection: 'Prioritize recipes under 20 minutes with minimal prep. Keep it simple but delicious—something a busy home cook would appreciate.',
  },
  {
    id: 'reduce_waste',
    label: 'Reduce Waste',
    emoji: '♻️',
    promptInjection: "Use as many items from the 'Expiring Soon' list as possible. Be creative in combining these ingredients into a cohesive, appetizing dish.",
  },
  {
    id: 'one_pot',
    label: 'One-Pot',
    emoji: '🍲',
    promptInjection: 'Create a one-pot or one-pan meal with minimal cleanup. Layer flavors thoughtfully so everything cooks together harmoniously.',
  },
  {
    id: 'crockpot',
    label: 'Crockpot',
    emoji: '🥘',
    promptInjection: 'Design a slow cooker recipe with proper layering and timing. Create deep, developed flavors that benefit from long cooking.',
  },
  {
    id: 'instant_pot',
    label: 'Instant Pot',
    emoji: '⏱️',
    promptInjection: 'Optimize for electric pressure cooker with proper pressure cooking times. Include quick-release or natural-release instructions as appropriate.',
  },
  {
    id: 'air_fryer',
    label: 'Air Fryer',
    emoji: '🍳',
    promptInjection: 'Optimize for air fryer with proper temperature and timing. Achieve crispy results without deep frying.',
  },
  {
    id: 'meal_prep',
    label: 'Meal Prep',
    emoji: '📦',
    promptInjection: 'Design a recipe ideal for meal prepping. It should store well for 3-5 days refrigerated, reheat easily, and maintain good texture. Consider making larger batch sizes.',
  },
];

// Chef Studio only filters (not shown on Dashboard)
export const CHEF_STUDIO_ONLY_FILTERS: RecipeFilterType[] = ['meal_prep'];

// Staged Recipe (from clipboard paste)
export interface StagedRecipeIngredient {
  item: string;
  qty: number;
  unit: string;
  notes?: string;
}

export interface StagedRecipeMetrics {
  prep_time: number;
  cook_time: number;
  protein?: string;
}

export interface StagedRecipe {
  title: string;
  description?: string;
  servings: number;
  ingredients: StagedRecipeIngredient[];
  instructions: string[];
  metrics: StagedRecipeMetrics;
}

// Helper to scale ingredients based on servings
export function scaleIngredients(
  ingredients: StagedRecipeIngredient[],
  originalServings: number,
  newServings: number
): StagedRecipeIngredient[] {
  const factor = newServings / originalServings;
  return ingredients.map(ing => ({
    ...ing,
    qty: Math.round(ing.qty * factor * 100) / 100, // Round to 2 decimal places
  }));
}

// Helper to validate JSON pasted from external AI
export function parseStagedRecipe(jsonString: string): StagedRecipe | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    if (!parsed.title || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions)) {
      return null;
    }
    
    return {
      title: parsed.title,
      servings: parsed.servings || 4,
      ingredients: parsed.ingredients.map((ing: any) => ({
        item: ing.item || ing.name || '',
        qty: Number(ing.qty) || Number(ing.quantity) || 1,
        unit: ing.unit || '',
      })),
      instructions: parsed.instructions,
      metrics: {
        prep_time: parsed.metrics?.prep_time || 0,
        cook_time: parsed.metrics?.cook_time || 0,
        protein: parsed.metrics?.protein,
      },
    };
  } catch {
    return null;
  }
}
