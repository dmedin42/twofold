import React from 'react';
import { StagedRecipeIngredient } from '@/types/recipe';
import { InventoryItem } from '@/types/household';
import { getPerishableIngredients, PERISHABLE_CATEGORIES } from '@/lib/pantryMatcher';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingBag, Check, Snowflake } from 'lucide-react';

interface PantryDeductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipeTitle: string;
  ingredients: StagedRecipeIngredient[];
  inventory: InventoryItem[];
}

const PantryDeductDialog: React.FC<PantryDeductDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipeTitle,
  ingredients,
  inventory,
}) => {
  // Only show perishable items that can be deducted
  const perishableItems = getPerishableIngredients(ingredients, inventory);
  
  if (perishableItems.length === 0) {
    // No perishable items to deduct, just show confirmation
    return (
      <AlertDialog open={isOpen} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Recipe Saved!
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{recipeTitle}" has been saved to your cookbook. No perishable items to deduct from pantry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onClose}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Update Pantry?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Deduct these <strong>perishable items</strong> from your pantry?
            </p>
            <p className="text-xs text-muted-foreground">
              (Shelf-stable items like spices and dry goods won't be deducted)
            </p>
            <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
              <ul className="space-y-1 text-sm">
                {perishableItems.slice(0, 8).map(({ ingredient, pantryItem }, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    {pantryItem.isFrozen ? (
                      <Snowflake className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                    <span>{ingredient.qty} {ingredient.unit} {ingredient.item}</span>
                    <span className="text-muted-foreground text-xs ml-auto">
                      ({pantryItem.category})
                    </span>
                  </li>
                ))}
                {perishableItems.length > 8 && (
                  <li className="text-muted-foreground">
                    +{perishableItems.length - 8} more items
                  </li>
                )}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Skip, just save
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Deduct {perishableItems.length} item{perishableItems.length > 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PantryDeductDialog;
