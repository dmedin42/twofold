import React, { useState, useMemo } from 'react';
import { StagedRecipe, StagedRecipeIngredient, scaleIngredients, parseStagedRecipe } from '@/types/recipe';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ChefHat, Clock, Users, Save, X, ClipboardPaste, AlertCircle, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import EditableIngredientList from './EditableIngredientList';
import PantryDeductDialog from './PantryDeductDialog';
import { getPantryAvailability } from '@/lib/pantryMatcher';

interface RecipeReaderViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: StagedRecipe, shouldDeductPantry: boolean) => void;
}

const RecipeReaderView: React.FC<RecipeReaderViewProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { inventory } = useHousehold();
  const [pastedJson, setPastedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [stagedRecipe, setStagedRecipe] = useState<StagedRecipe | null>(null);
  const [currentServings, setCurrentServings] = useState(4);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showPantryDeduct, setShowPantryDeduct] = useState(false);
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<StagedRecipeIngredient[]>([]);

  // Scale ingredients based on current servings
  const scaledIngredients = useMemo(() => {
    if (!stagedRecipe) return [];
    const baseIngredients = isEditingIngredients ? editedIngredients : stagedRecipe.ingredients;
    return scaleIngredients(baseIngredients, stagedRecipe.servings, currentServings);
  }, [stagedRecipe, currentServings, isEditingIngredients, editedIngredients]);

  // Pantry availability stats
  const pantryAvailability = useMemo(() => {
    if (!stagedRecipe) return null;
    return getPantryAvailability(scaledIngredients, inventory);
  }, [scaledIngredients, inventory, stagedRecipe]);

  const handlePaste = () => {
    const parsed = parseStagedRecipe(pastedJson);
    if (parsed) {
      setStagedRecipe(parsed);
      setCurrentServings(parsed.servings);
      setEditedIngredients(parsed.ingredients);
      setParseError(null);
    } else {
      setParseError('Invalid recipe format. Please paste valid JSON from your AI.');
    }
  };

  const handleClose = () => {
    if (stagedRecipe) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setPastedJson('');
    setParseError(null);
    setStagedRecipe(null);
    setCurrentServings(4);
    setShowDiscardConfirm(false);
    setShowPantryDeduct(false);
    setIsEditingIngredients(false);
    setEditedIngredients([]);
    onClose();
  };

  const handleSaveClick = () => {
    if (stagedRecipe) {
      setShowPantryDeduct(true);
    }
  };

  const handleSaveWithDeduct = (shouldDeduct: boolean) => {
    if (stagedRecipe) {
      // Use edited ingredients if user made changes
      const finalIngredients = isEditingIngredients ? editedIngredients : stagedRecipe.ingredients;
      
      // Save with current servings applied
      const savedRecipe: StagedRecipe = {
        ...stagedRecipe,
        servings: currentServings,
        ingredients: scaleIngredients(finalIngredients, stagedRecipe.servings, currentServings),
      };
      onSave(savedRecipe, shouldDeduct);
      resetAndClose();
    }
  };

  const handleStartEditing = () => {
    if (stagedRecipe) {
      setEditedIngredients([...stagedRecipe.ingredients]);
      setIsEditingIngredients(true);
    }
  };

  const handleFinishEditing = () => {
    setIsEditingIngredients(false);
    // Update the staged recipe with edited ingredients
    if (stagedRecipe) {
      setStagedRecipe({
        ...stagedRecipe,
        ingredients: editedIngredients,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {stagedRecipe ? stagedRecipe.title : 'Import Recipe'}
            </DialogTitle>
            <DialogDescription>
              {stagedRecipe 
                ? 'Review and adjust before saving to your cookbook'
                : 'Paste the recipe response from your AI assistant'}
            </DialogDescription>
          </DialogHeader>

          {!stagedRecipe ? (
            // Paste Input View
            <div className="space-y-4 py-4">
              <div>
                <Label>Paste AI Response</Label>
                <Textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder='Paste the recipe response from your AI here...'
                  className="mt-1.5 font-mono text-sm h-48"
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Couldn't read the recipe. Make sure you copied the full response from your AI.</span>
                </div>
              )}

              <Button
                onClick={handlePaste}
                disabled={!pastedJson.trim()}
                className="w-full rounded-xl"
              >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Parse Recipe
              </Button>
            </div>
          ) : (
            // Recipe Reader View
            <div className="space-y-6 py-4">
              {/* Metrics Row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {stagedRecipe.metrics.prep_time > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Prep: {stagedRecipe.metrics.prep_time}m</span>
                  </div>
                )}
                {stagedRecipe.metrics.cook_time > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Cook: {stagedRecipe.metrics.cook_time}m</span>
                  </div>
                )}
                {stagedRecipe.metrics.protein && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {stagedRecipe.metrics.protein}
                  </span>
                )}
                {pantryAvailability && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs ml-auto",
                    pantryAvailability.percentage >= 75 ? "bg-green-100 text-green-700" :
                    pantryAvailability.percentage >= 50 ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {pantryAvailability.available}/{pantryAvailability.total} in pantry
                  </span>
                )}
              </div>

              {/* Serving Adjuster */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Servings:</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                    className="h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={currentServings}
                    onChange={(e) => setCurrentServings(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 h-8 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentServings(currentServings + 1)}
                    className="h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
                {currentServings !== stagedRecipe.servings && (
                  <span className="text-xs text-muted-foreground">
                    (original: {stagedRecipe.servings})
                  </span>
                )}
              </div>

              {/* Ingredients with Edit Toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">Ingredients</h4>
                  {!isEditingIngredients ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditing}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFinishEditing}
                      className="text-xs text-primary"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Done
                    </Button>
                  )}
                </div>
                <EditableIngredientList
                  ingredients={isEditingIngredients ? editedIngredients : stagedRecipe.ingredients}
                  originalServings={stagedRecipe.servings}
                  currentServings={isEditingIngredients ? stagedRecipe.servings : currentServings}
                  onChange={setEditedIngredients}
                  isEditing={isEditingIngredients}
                  inventory={inventory}
                  showPantryMatch={!isEditingIngredients}
                />
                {isEditingIngredients && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Fix any transcription errors or missing units. Scaling is applied after editing.
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Instructions</h4>
                <ol className="space-y-3">
                  {stagedRecipe.instructions.map((step, idx) => (
                    <li key={idx} className="text-sm flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Discard
            </Button>
            {stagedRecipe && (
              <Button onClick={handleSaveClick} className="rounded-xl">
                <Save className="w-4 h-4 mr-2" />
                Save to Cookbook
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Save this recipe to your cookbook before leaving? Unsaved recipes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetAndClose}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveClick}>Save to Cookbook</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pantry Deduct Dialog */}
      {stagedRecipe && (
        <PantryDeductDialog
          isOpen={showPantryDeduct}
          onClose={() => {
            // User clicked "No thanks" - save without deducting
            setShowPantryDeduct(false);
            handleSaveWithDeduct(false);
          }}
          onConfirm={() => {
            // User clicked "Deduct" - save with deducting
            setShowPantryDeduct(false);
            handleSaveWithDeduct(true);
          }}
          recipeTitle={stagedRecipe.title}
          ingredients={scaledIngredients}
          inventory={inventory}
        />
      )}
    </>
  );
};

export default RecipeReaderView;
