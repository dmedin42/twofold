import React from 'react';
import { StagedRecipeIngredient } from '@/types/recipe';
import { InventoryItem } from '@/types/household';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, Check, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatQuantity, convertToLargerUnit } from '@/lib/unitConversion';
import { matchIngredientsToInventory, PantryMatchResult } from '@/lib/pantryMatcher';

interface EditableIngredientListProps {
  ingredients: StagedRecipeIngredient[];
  originalServings: number;
  currentServings: number;
  onChange: (ingredients: StagedRecipeIngredient[]) => void;
  isEditing?: boolean;
  inventory?: InventoryItem[];
  showPantryMatch?: boolean;
}

const EditableIngredientList: React.FC<EditableIngredientListProps> = ({
  ingredients,
  originalServings,
  currentServings,
  onChange,
  isEditing = false,
  inventory = [],
  showPantryMatch = false,
}) => {
  const scaleFactor = currentServings / originalServings;
  
  // Get pantry matches if inventory provided
  const pantryMatches: PantryMatchResult[] = showPantryMatch && inventory.length > 0
    ? matchIngredientsToInventory(ingredients, inventory)
    : [];

  const handleIngredientChange = (
    index: number,
    field: keyof StagedRecipeIngredient,
    value: string | number
  ) => {
    const updated = ingredients.map((ing, i) => {
      if (i !== index) return ing;
      return { ...ing, [field]: value };
    });
    onChange(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const handleAddIngredient = () => {
    onChange([...ingredients, { item: '', qty: 1, unit: '' }]);
  };

  return (
    <div className="space-y-2">
      {ingredients.map((ing, idx) => {
        const scaledQty = ing.qty * scaleFactor;
        const converted = convertToLargerUnit(scaledQty, ing.unit);
        const displayQty = formatQuantity(converted.qty);
        const displayUnit = converted.unit !== ing.unit ? converted.unit : ing.unit;
        const wasConverted = converted.unit !== ing.unit;
        
        // Get pantry match info
        const match = pantryMatches[idx];
        const isInPantry = match?.isInPantry;
        const hasEnough = match?.hasEnough;

        return (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2 text-sm",
              isEditing ? "bg-muted/50 rounded-lg p-2" : ""
            )}
          >
            {!isEditing ? (
              <>
                {/* Pantry status indicator */}
                {showPantryMatch && (
                  <span className="flex-shrink-0">
                    {isInPantry ? (
                      hasEnough ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </span>
                )}
                {!showPantryMatch && (
                  <span className="w-2 h-2 rounded-full bg-primary/50 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "font-medium min-w-[60px]",
                    currentServings !== originalServings && "text-primary"
                  )}
                  title={wasConverted ? `Original: ${formatQuantity(scaledQty)} ${ing.unit}` : undefined}
                >
                  {displayQty} {displayUnit}
                </span>
                <span className={cn(
                  "text-muted-foreground",
                  isInPantry && "text-foreground"
                )}>
                  {ing.item}
                </span>
                {showPantryMatch && isInPantry && !hasEnough && match?.availableQty !== undefined && (
                  <span className="text-xs text-amber-600 ml-auto">
                    (have {match.availableQty})
                  </span>
                )}
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={ing.qty}
                  onChange={(e) =>
                    handleIngredientChange(idx, 'qty', parseFloat(e.target.value) || 0)
                  }
                  className="w-16 h-8 text-center"
                  placeholder="Qty"
                />
                <Input
                  type="text"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                  className="w-20 h-8"
                  placeholder="Unit"
                />
                <Input
                  type="text"
                  value={ing.item}
                  onChange={(e) => handleIngredientChange(idx, 'item', e.target.value)}
                  className="flex-1 h-8"
                  placeholder="Ingredient name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIngredient(idx)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        );
      })}

      {isEditing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddIngredient}
          className="w-full mt-2 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Ingredient
        </Button>
      )}
      
      {/* Pantry legend */}
      {showPantryMatch && !isEditing && pantryMatches.length > 0 && (
        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t mt-3">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-500" /> In pantry
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Low stock
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-muted-foreground/40" /> Need to buy
          </span>
        </div>
      )}
    </div>
  );
};

export default EditableIngredientList;
