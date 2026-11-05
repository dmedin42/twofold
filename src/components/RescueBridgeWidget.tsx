import React, { useState, useRef, useEffect } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useBackgroundTasks } from '@/contexts/BackgroundTaskContext';
import RecipeFilterChips from './RecipeFilterChips';
import { RecipeFilterType, StagedRecipe } from '@/types/recipe';
import { getTopExpiringItems, getExpiringItems } from '@/lib/recipeBridge';
import { getDaysUntilExpiry } from '@/data/expiryUtils';
import { Sparkles, AlertTriangle, Users, X, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ChefLoadingSpinner from '@/components/ChefLoadingSpinner';
import { trackApiCall, trackFeatureUse } from '@/lib/operatorTracking';

interface RescueBridgeWidgetProps {
  onRecipeSaved?: (recipe: StagedRecipe) => void;
  initialNote?: string;
  pendingTaskId?: string;
}

interface AIResponse {
  name: string;
  description: string;
  ingredients?: { item: string; qty: number; unit: string }[];
  usesIngredients?: string[];
  used_ingredients?: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  instructions: string[];
  tips?: string;
  metrics?: { prep_time?: number; cook_time?: number; servings?: number };
}

const RescueBridgeWidget: React.FC<RescueBridgeWidgetProps> = ({ onRecipeSaved, initialNote, pendingTaskId }) => {
  const { inventory, updateItemQuantity, addSavedRecipe } = useHousehold();
  const { startTask, cancelTask, getTask, activeTask, clearTask } = useBackgroundTasks();
  const [selectedFilters, setSelectedFilters] = useState<RecipeFilterType[]>(['reduce_waste']);
  const [requestedServings, setRequestedServings] = useState(4);
  const [customFilterText, setCustomFilterText] = useState(initialNote || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<AIResponse | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  const expiringItems = getExpiringItems(inventory, 5);
  const topExpiring = getTopExpiringItems(inventory, 3);
  const expiringItemNames = expiringItems.map(i => i.name);

  // Restore recipe from a pending background task (deep-link)
  useEffect(() => {
    if (pendingTaskId) {
      const task = getTask(pendingTaskId);
      if (task?.status === 'completed' && task.result) {
        setGeneratedRecipe(task.result);
        clearTask(pendingTaskId);
      }
    }
  }, [pendingTaskId, getTask, clearTask]);

  // Check for completed background tasks
  useEffect(() => {
    if (currentTaskIdRef.current) {
      const task = getTask(currentTaskIdRef.current);
      if (task?.status === 'completed' && task.result) {
        setGeneratedRecipe(task.result);
        setIsLoading(false);
        toast.success("AI Recipe Prepared!");
        currentTaskIdRef.current = null;
      } else if (task?.status === 'failed') {
        setIsLoading(false);
        toast.error('Chef is busy. Try again later.');
        currentTaskIdRef.current = null;
      } else if (task?.status === 'cancelled') {
        setIsLoading(false);
        currentTaskIdRef.current = null;
      }
    }
  }, [getTask, activeTask]);

  const handleToggleFilter = (filter: RecipeFilterType) => {
    setSelectedFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedRecipe(null);

    const ingredients = expiringItemNames.length > 0 
      ? expiringItemNames 
      : [...inventory].sort((a, b) => a.category.localeCompare(b.category)).map(i => i.name).slice(0, 10);

    const taskId = startTask('recipe', 'Generating rescue recipe...', async (signal) => {
      return await trackApiCall('rescue-recipe', async () => {
        const { data, error } = await supabase.functions.invoke('rescue-recipe', {
          body: {
            ingredients,
            filters: selectedFilters,
            customNote: customFilterText,
            servings: requestedServings
          },
          headers: { 'Connection': 'keep-alive' },
        });

        if (signal.aborted) {
          throw new DOMException('Cancelled', 'AbortError');
        }

        if (error) throw error;
        return data;
      });
    });

    currentTaskIdRef.current = taskId;
  };

  const handleCancelGeneration = () => {
    if (currentTaskIdRef.current) {
      cancelTask(currentTaskIdRef.current);
      currentTaskIdRef.current = null;
    }
    setIsLoading(false);
    toast.info("Recipe generation cancelled");
  };

  const handleSaveRecipe = (shouldDeductPantry: boolean) => {
    if (!generatedRecipe) return;

    // Normalize ingredients from either response shape
    const ingredientsList = generatedRecipe.ingredients
      ? generatedRecipe.ingredients.map(ing => ({
          item: ing.item, qty: ing.qty, unit: ing.unit, notes: ''
        }))
      : (generatedRecipe.usesIngredients || []).map(ing => ({
          item: ing, qty: 1, unit: 'serving', notes: ''
        }));

    const prepTime = generatedRecipe.metrics?.prep_time ?? (parseInt(generatedRecipe.prepTime || '') || 15);
    const cookTime = generatedRecipe.metrics?.cook_time ?? (parseInt(generatedRecipe.cookTime || '') || 30);
    const servings = generatedRecipe.metrics?.servings ?? generatedRecipe.servings ?? 4;

    const newRecipe: StagedRecipe = {
      title: generatedRecipe.name,
      description: generatedRecipe.description,
      servings,
      ingredients: ingredientsList,
      instructions: generatedRecipe.instructions.map(inst => 
        typeof inst === 'string' ? inst : (inst as any).instruction || String(inst)
      ),
      metrics: { prep_time: prepTime, cook_time: cookTime }
    };

    // Passing the recipe and its tags to the cookbook
    addSavedRecipe(newRecipe, selectedFilters);
    
    toast.success(`"${newRecipe.title}" is officially on the menu!`);
    onRecipeSaved?.(newRecipe);

    if (shouldDeductPantry && inventory) {
      // Pantry logic stays the same—keeping the fridge tidy!
      newRecipe.ingredients.forEach(ing => {
        const pantryItem = inventory.find(i => 
          i.name.toLowerCase().includes(ing.item.toLowerCase())
        );
        
        if (pantryItem && ['Meat', 'Dairy', 'Produce', 'Bakery', 'Frozen', 'Beverages'].includes(pantryItem.category)) {
          updateItemQuantity(pantryItem.id, Math.max(0, pantryItem.quantity - 1));
        }
      });
    }

    setGeneratedRecipe(null);
  };

  // --- Inventory Guard ---
  if (inventory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 text-primary-foreground shadow-elevated">
        <h2 className="font-display text-xl font-semibold mb-2">Pantry is Empty</h2>
        <p className="text-sm opacity-80">Add items to enable the AI Recipe Chef.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground transition-all duration-300 min-h-[320px] flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 gap-4">
          <ChefLoadingSpinner size="lg" className="text-white" />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancelGeneration}
            className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <p className="text-xs text-white/70 text-center">
            You can navigate away - we'll keep cooking in the background.
          </p>
        </div>
      ) : generatedRecipe ? (
        /* --- REVIEW MODE --- */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold">{generatedRecipe.name}</h2>
              <div className="flex items-center gap-3 text-xs opacity-80 mt-1">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {generatedRecipe.metrics?.prep_time ?? generatedRecipe.prepTime ?? '15'}m</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {generatedRecipe.metrics?.servings ?? generatedRecipe.servings ?? 4} ppl</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/70 hover:bg-white/20" 
              onClick={() => setGeneratedRecipe(null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="bg-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <p className="text-sm opacity-90 leading-relaxed mb-3">{generatedRecipe.description}</p>
            <div className="text-xs opacity-70">
              <strong>Uses: </strong> {(generatedRecipe.used_ingredients || generatedRecipe.usesIngredients || generatedRecipe.ingredients?.map(i => i.item) || []).join(", ")}
            </div>
            {generatedRecipe.tips && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs italic opacity-80 flex gap-2">
                  <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                  {generatedRecipe.tips}
                </div>
            )}
          </div>

          <div className="flex gap-2 mt-auto">
              <Button onClick={() => setGeneratedRecipe(null)} variant="secondary" className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0">
                Discard
              </Button>
              <Button onClick={() => handleSaveRecipe(false)} className="flex-1 bg-white text-primary hover:bg-white/90 font-semibold border-0">
                Save to Cookbook
              </Button>
          </div>
        </div>
      ) : (
        /* --- CONFIGURATION MODE --- */
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">AI Recipe Generator</h2>
              <p className="text-xs opacity-70">Turn expiring food into dinner</p>
            </div>
          </div>

          {topExpiring.length > 0 && (
            <div className="mb-4">
              <p className="text-sm opacity-80 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Expiring soon:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topExpiring.map((item) => (
                  <span key={item.id} className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                    {item.name} ({getDaysUntilExpiry(item.expiryDate)}d)
                  </span>
                ))}
                {expiringItems.length > 3 && (
                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">+{expiringItems.length - 3} more</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <RecipeFilterChips
              selectedFilters={selectedFilters}
              onToggleFilter={handleToggleFilter}
              className="[&_button]:bg-white/10 [&_button]:border-white/20 [&_button]:text-white/90 [&_button.bg-primary]:bg-white [&_button.bg-primary]:text-primary"
            />
            
            <div className="flex gap-3">
              <div className="flex-1">
                <Input 
                  placeholder="Notes (e.g. extra spicy)" 
                  value={customFilterText}
                  onChange={(e) => setCustomFilterText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-10 rounded-xl"
                />
              </div>
              <div className="w-20 relative">
                <Users className="w-4 h-4 absolute left-2.5 top-3 opacity-60 pointer-events-none" />
                <Input 
                  type="number" min={1} max={12}
                  value={requestedServings}
                  onChange={(e) => setRequestedServings(parseInt(e.target.value) || 4)}
                  className="bg-white/10 border-white/20 text-white text-center pl-6 h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            variant="secondary"
            className="w-full h-12 mt-auto rounded-xl bg-white text-primary hover:bg-white/90 font-bold border-0 shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Rescue Recipe
          </Button>
        </div>
      )}
    </div>
  );
};

export default RescueBridgeWidget;