import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Recipe } from '@/types/household';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Check, Package, Minus, X, AlertTriangle, Snowflake, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { normalizeUnit, convertUnits, areUnitsCompatible } from '@/lib/atomicUnits';
import { ChefAssistant } from '@/components/ChefAssistant';

interface CookingModeSheetProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  scaledServings: number;
}

interface IngredientDeduction {
  ingredientName: string;
  inventoryId: string | null;
  inventoryName: string | null;
  neededQty: number;
  availableQty: number;
  unit: string;
  canDeduct: boolean;
  isFrozen: boolean;
  checked: boolean;
}

const PERISHABLE_CATEGORIES = ['Meat', 'Dairy', 'Produce', 'Bakery', 'Frozen', 'Beverages'];

const CookingModeSheet: React.FC<CookingModeSheetProps> = ({
  recipe,
  isOpen,
  onClose,
  scaledServings,
}) => {
  const { inventory, updateItemQuantity } = useHousehold();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [deductionItems, setDeductionItems] = useState<IngredientDeduction[]>([]);
  const [isDeducting, setIsDeducting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS: Read current step aloud
  const currentStep = useMemo(() => {
    // Find the first unchecked step
    for (let i = 0; i < (recipe?.instructions.length || 0); i++) {
      if (!completedSteps.has(i)) return i;
    }
    return -1;
  }, [completedSteps, recipe]);

  useEffect(() => {
    if (!ttsEnabled || !recipe || currentStep < 0) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(recipe.instructions[currentStep]);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [ttsEnabled, currentStep, recipe]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleTts = useCallback(() => {
    if (ttsEnabled) {
      window.speechSynthesis.cancel();
    }
    setTtsEnabled(prev => !prev);
  }, [ttsEnabled]);

  // Calculate deductions when sheet opens
  useMemo(() => {
    if (!recipe || !isOpen) return;

    // Milestone: cooking mode opened
    window.dispatchEvent(new CustomEvent('chef-milestone', { detail: { type: 'cooking_mode' } }));

    const ratio = scaledServings / recipe.servings;

    const deductions: IngredientDeduction[] = recipe.ingredients.map((ing) => {
      const neededQty = ing.quantity * ratio;
      const ingName = ing.name.toLowerCase().trim();
      const ingUnit = normalizeUnit(ing.unit || 'count');

      // Find matching inventory item
      const matchedItem = inventory.find((item) => {
        if (item.quantity <= 0) return false;
        const itemName = item.name.toLowerCase().trim();
        return itemName.includes(ingName) || ingName.includes(itemName);
      });

      if (!matchedItem) {
        return {
          ingredientName: ing.name,
          inventoryId: null,
          inventoryName: null,
          neededQty,
          availableQty: 0,
          unit: ing.unit,
          canDeduct: false,
          isFrozen: false,
          checked: false,
        };
      }

      // Only deduct from perishable categories
      const isPerishable = PERISHABLE_CATEGORIES.includes(matchedItem.category);
      
      const itemUnit = normalizeUnit(matchedItem.unit || 'count');
      let availableQty = matchedItem.quantity;

      if (ingUnit !== itemUnit && areUnitsCompatible(ingUnit, itemUnit)) {
        const converted = convertUnits(matchedItem.quantity, itemUnit, ingUnit);
        if (converted !== null) {
          availableQty = converted;
        }
      }

      return {
        ingredientName: ing.name,
        inventoryId: matchedItem.id,
        inventoryName: matchedItem.name,
        neededQty,
        availableQty,
        unit: ing.unit,
        canDeduct: isPerishable && availableQty >= neededQty,
        isFrozen: matchedItem.isFrozen || false,
        checked: isPerishable && availableQty >= neededQty,
      };
    });

    setDeductionItems(deductions);
    setCompletedSteps(new Set());
  }, [recipe, inventory, scaledServings, isOpen]);

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
  };

  const toggleDeductionItem = (index: number) => {
    setDeductionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleDeductFromPantry = async () => {
    const itemsToDeduct = deductionItems.filter((d) => d.checked && d.inventoryId);
    if (itemsToDeduct.length === 0) {
      toast.info('No items selected for deduction');
      return;
    }

    setIsDeducting(true);
    let deductedCount = 0;

    for (const deduction of itemsToDeduct) {
      if (!deduction.inventoryId) continue;

      const inventoryItem = inventory.find((i) => i.id === deduction.inventoryId);
      if (!inventoryItem) continue;

      const newQuantity = Math.max(0, inventoryItem.quantity - deduction.neededQty);
      await updateItemQuantity(deduction.inventoryId, newQuantity);
      deductedCount++;
    }

    setIsDeducting(false);
    
    if (deductedCount > 0) {
      toast.success(`Pantry updated!`, {
        description: `${deductedCount} item${deductedCount > 1 ? 's' : ''} deducted.`,
      });
    }
  };

  if (!recipe) return null;

  const allStepsComplete = completedSteps.size === recipe.instructions.length;
  const checkedDeductions = deductionItems.filter((d) => d.checked).length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg" side="right">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <SheetTitle className="font-display text-xl text-left">
                Cooking Mode
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {recipe.name} · {scaledServings} servings
              </p>
            </div>
            <Button
              variant={ttsEnabled ? "default" : "outline"}
              size="icon"
              className="shrink-0 rounded-full"
              onClick={toggleTts}
              title={ttsEnabled ? "Disable voice" : "Enable voice"}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-8 pb-24">
          {/* Ingredients Checklist */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-lg">Ingredients</h3>
            <div className="space-y-2">
              {deductionItems.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors",
                    item.canDeduct
                      ? "bg-green-500/10"
                      : item.inventoryId
                      ? "bg-amber-500/10"
                      : "bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full shrink-0",
                      item.canDeduct
                        ? "bg-green-500"
                        : item.inventoryId
                        ? "bg-amber-500"
                        : "bg-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {item.neededQty > 0 && `${Math.round(item.neededQty * 100) / 100} `}
                      {item.unit && `${item.unit} `}
                      {item.ingredientName}
                    </p>
                    {item.inventoryId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Have {item.availableQty} {item.unit}
                        {item.isFrozen && (
                          <span className="text-sky-500 flex items-center gap-0.5 ml-1">
                            <Snowflake className="w-3 h-3" /> frozen
                          </span>
                        )}
                      </p>
                    )}
                    {!item.inventoryId && (
                      <p className="text-xs text-muted-foreground">Not in pantry</p>
                    )}
                  </div>
                  {item.canDeduct ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : item.inventoryId ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions with checkboxes */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-lg">Instructions</h3>
            <div className="space-y-4">
              {recipe.instructions.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                    completedSteps.has(idx)
                      ? "bg-primary/5 border-primary/30"
                      : idx === currentStep
                      ? "bg-secondary/5 border-secondary/30 ring-2 ring-secondary/20"
                      : "bg-card border-border hover:border-primary/20"
                  )}
                  onClick={() => toggleStep(idx)}
                >
                  <div
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                      completedSteps.has(idx)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completedSteps.has(idx) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-base leading-relaxed pt-1",
                      completedSteps.has(idx)
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Deduct from Pantry */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Minus className="w-4 h-4" />
                Deduct from Pantry
              </h3>
              <span className="text-sm text-muted-foreground">
                {checkedDeductions} items
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deductionItems.map((item, idx) => (
                <label
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    item.canDeduct
                      ? "hover:bg-accent"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleDeductionItem(idx)}
                    disabled={!item.canDeduct}
                  />
                  <span className="text-sm flex-1">
                    {item.ingredientName}
                    {item.inventoryName && item.inventoryName !== item.ingredientName && (
                      <span className="text-muted-foreground">
                        {' '}
                        (as {item.inventoryName})
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    -{Math.round(item.neededQty * 100) / 100} {item.unit}
                  </span>
                </label>
              ))}
            </div>

            <Button
              onClick={handleDeductFromPantry}
              disabled={checkedDeductions === 0 || isDeducting}
              className="w-full"
            >
              {isDeducting ? (
                'Updating Pantry...'
              ) : (
                <>
                  <Minus className="w-4 h-4 mr-2" />
                  Deduct {checkedDeductions} Items
                </>
              )}
            </Button>
          </div>

          {/* Completion message */}
          {allStepsComplete && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-medium">
                🎉 All steps complete! Enjoy your meal!
              </p>
            </div>
          )}
        </div>

        {/* AI Voice Assistant - Floating */}
        <ChefAssistant recipe={recipe} onClose={() => {}} />

      </SheetContent>
    </Sheet>
  );
};

export default CookingModeSheet;
