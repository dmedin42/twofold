import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, RecipeIngredient } from '@/types/household';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Heart, Trash2, Pencil, Save, X, Plus, Minus, Package, Snowflake, ShoppingCart, Check, AlertTriangle, Play, Share2, Link, Loader2, BookOpen } from 'lucide-react';
import RecipeStory from '@/components/RecipeStory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { areUnitsCompatible, convertUnits, normalizeUnit } from '@/lib/atomicUnits';

interface PantryStatus {
  name: string;
  status: 'in-stock' | 'frozen' | 'low' | 'missing';
  available?: number;
  needed: number;
  unit: string;
}

interface RecipeDetailSheetProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Omit<Recipe, 'id' | 'createdAt' | 'createdByUid'>>) => void;
  onStartCooking?: (recipe: Recipe, servings?: number) => void;
}

const RecipeDetailSheet: React.FC<RecipeDetailSheetProps> = ({
  recipe,
  isOpen,
  onClose,
  onToggleLike,
  onDelete,
  onUpdate,
  onStartCooking
}) => {
  const { inventory, addToGroceryList, activeUser } = useHousehold();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editServings, setEditServings] = useState(4);
  const [editPrepTime, setEditPrepTime] = useState(0);
  const [editCookTime, setEditCookTime] = useState(0);
  const [editIngredients, setEditIngredients] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  
  // Serving adjustment for viewing (not editing)
  const [viewServings, setViewServings] = useState(4);

  // Compute pantry status for each ingredient with unit-aware matching
  const pantryStatuses = useMemo((): PantryStatus[] => {
    if (!recipe) return [];
    
    const ratio = viewServings / recipe.servings;
    
    return recipe.ingredients.map(ing => {
      const neededQty = ing.quantity * ratio;
      const ingName = ing.name.toLowerCase().trim();
      const ingUnit = normalizeUnit(ing.unit || 'count');
      
      // Find matching inventory item (fuzzy match on name)
      const matchedItem = inventory.find(item => {
        if (item.quantity <= 0) return false;
        const itemName = item.name.toLowerCase().trim();
        return itemName.includes(ingName) || ingName.includes(itemName);
      });
      
      if (!matchedItem) {
        return {
          name: ing.name,
          status: 'missing' as const,
          needed: neededQty,
          unit: ing.unit,
        };
      }
      
      // Get available quantity, converting units if needed
      const itemUnit = normalizeUnit(matchedItem.unit || 'count');
      let availableQty = matchedItem.quantity;
      
      // Attempt unit conversion if units differ
      if (ingUnit !== itemUnit && areUnitsCompatible(ingUnit, itemUnit)) {
        const converted = convertUnits(matchedItem.quantity, itemUnit, ingUnit);
        if (converted !== null) {
          availableQty = converted;
        }
      }
      
      if (matchedItem.isFrozen) {
        return {
          name: ing.name,
          status: 'frozen' as const,
          available: availableQty,
          needed: neededQty,
          unit: ing.unit,
        };
      }
      
      if (availableQty < neededQty) {
        return {
          name: ing.name,
          status: 'low' as const,
          available: availableQty,
          needed: neededQty,
          unit: ing.unit,
        };
      }
      
      return {
        name: ing.name,
        status: 'in-stock' as const,
        available: availableQty,
        needed: neededQty,
        unit: ing.unit,
      };
    });
  }, [recipe, inventory, viewServings]);

  // Group by status for summary
  const { inStock, frozen, low, missing } = useMemo(() => ({
    inStock: pantryStatuses.filter(s => s.status === 'in-stock'),
    frozen: pantryStatuses.filter(s => s.status === 'frozen'),
    low: pantryStatuses.filter(s => s.status === 'low'),
    missing: pantryStatuses.filter(s => s.status === 'missing'),
  }), [pantryStatuses]);

  const handleAddMissingToGroceryList = () => {
    const itemsToAdd = [...missing, ...low];
    itemsToAdd.forEach(item => {
      addToGroceryList({
        name: item.name,
        quantity: Math.ceil(item.needed - (item.available || 0)),
        unit: item.unit || 'item',
        addedByUid: activeUser?.uid || 'global',
      });
    });
    toast.success(`Added ${itemsToAdd.length} items to grocery list`);
  };

  // Reset edit state when recipe changes
  useEffect(() => {
    if (recipe) {
      setEditName(recipe.name);
      setEditServings(recipe.servings);
      setEditPrepTime(recipe.prepTime);
      setEditCookTime(recipe.cookTime);
      setEditIngredients(recipe.ingredients.map(ing => `${ing.quantity > 0 ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`).join('\n'));
      setEditInstructions(recipe.instructions.join('\n'));
      setEditTags(recipe.tags || []);
      setViewServings(recipe.servings);
    }
    setIsEditing(false);
    setNewTagInput('');
  }, [recipe]);

  // Calculate scaled quantity based on serving adjustment
  const getScaledQuantity = (originalQty: number): string => {
    if (!recipe || originalQty <= 0) return '';
    const ratio = viewServings / recipe.servings;
    const scaled = originalQty * ratio;
    if (scaled === Math.floor(scaled)) {
      return scaled.toString();
    }
    return scaled.toFixed(2).replace(/\.?0+$/, '');
  };

  const handleServingChange = (delta: number) => {
    setViewServings(prev => Math.max(1, prev + delta));
  };

  const handleAddTag = () => {
    const tag = newTagInput.trim();
    if (tag && !editTags.includes(tag)) {
      setEditTags(prev => [...prev, tag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!recipe) return null;

  // Helper to create URL-friendly slug from recipe name
  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const handleShareRecipe = async () => {
    setIsSharing(true);
    try {
      // Generate share code if not exists
      const shareCode = `r-${recipe.id.slice(0, 8)}`;
      
      // Update recipe to be public
      const { error } = await (supabase as any)
        .from('recipes')
        .update({ 
          is_public: true, 
          share_code: shareCode 
        })
        .eq('id', recipe.id);

      if (error) throw error;

      // Create slugified URL: <site>/[slug]/[code]
      const slug = createSlug(recipe.name);
      const shareUrl = `${window.location.origin}/${slug}/${shareCode}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!', {
        description: 'Anyone with this link can view the recipe',
      });
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Failed to share recipe');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    onDelete(recipe.id);
    setShowDeleteConfirm(false);
    onClose();
    toast.success('Recipe deleted');
  };

  const handleSaveEdits = () => {
    if (!editName.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    const parsedIngredients: RecipeIngredient[] = editIngredients.split('\n').filter(line => line.trim()).map(line => {
      const match = line.trim().match(/^([\d./]+)?\s*(\w+)?\s+(.+)$/);
      if (match) {
        return {
          quantity: parseFloat(match[1]) || 0,
          unit: match[2] || '',
          name: match[3].trim()
        };
      }
      return {
        quantity: 0,
        unit: '',
        name: line.trim()
      };
    });

    const parsedInstructions = editInstructions.split('\n').filter(line => line.trim());
    const updates = {
      name: editName.trim(),
      description: `${editPrepTime}m prep, ${editCookTime}m cook`,
      servings: editServings,
      prepTime: editPrepTime,
      cookTime: editCookTime,
      ingredients: parsedIngredients,
      instructions: parsedInstructions,
      tags: editTags
    };
    onUpdate?.(recipe.id, updates);
    setIsEditing(false);
    toast.success('Recipe updated');
  };

  const handleCancelEdit = () => {
    setEditName(recipe.name);
    setEditServings(recipe.servings);
    setEditPrepTime(recipe.prepTime);
    setEditCookTime(recipe.cookTime);
    setEditIngredients(recipe.ingredients.map(ing => `${ing.quantity > 0 ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`).join('\n'));
    setEditInstructions(recipe.instructions.join('\n'));
    setEditTags(recipe.tags || []);
    setNewTagInput('');
    setIsEditing(false);
  };

  // Get status icon and color for an ingredient
  const getIngredientStatusUI = (ingName: string) => {
    const status = pantryStatuses.find(s => s.name === ingName);
    if (!status) return null;
    
    switch (status.status) {
      case 'in-stock':
        return { icon: Check, color: 'text-green-600', bg: 'bg-green-500' };
      case 'frozen':
        return { icon: Snowflake, color: 'text-sky-500', bg: 'bg-sky-500' };
      case 'low':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500' };
      case 'missing':
        return { icon: Package, color: 'text-muted-foreground', bg: 'bg-muted-foreground' };
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              {isEditing ? (
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="font-display text-xl font-semibold" placeholder="Recipe name" />
              ) : (
                <SheetTitle className="font-display text-xl text-left">{recipe.name}</SheetTitle>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {!isEditing && (
                  <>
                    <button
                      onClick={handleShareRecipe}
                      disabled={isSharing}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      title="Share Recipe"
                    >
                      {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    <button onClick={() => onToggleLike(recipe.id)} className={cn("p-2 rounded-lg transition-colors", recipe.isLiked ? "text-rose-400 hover:bg-rose-50" : "text-muted-foreground hover:bg-accent")}>
                      <Heart className={cn("w-5 h-5", recipe.isLiked && "fill-current")} />
                    </button>
                  </>
                )}
                {onUpdate && !isEditing && (
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Tags */}
            {isEditing ? (
              <div className="mt-3">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {editTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs pr-1 flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add tag..."
                      className="h-6 w-24 text-xs px-2"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleAddTag}
                      disabled={!newTagInput.trim()}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Meta info */}
            {isEditing ? (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs">Servings</Label>
                  <Input type="number" min={1} value={editServings} onChange={e => setEditServings(Number(e.target.value) || 1)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Prep (min)</Label>
                  <Input type="number" min={0} value={editPrepTime} onChange={e => setEditPrepTime(Number(e.target.value) || 0)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Cook (min)</Label>
                  <Input type="number" min={0} value={editCookTime} onChange={e => setEditCookTime(Number(e.target.value) || 0)} className="mt-1" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleServingChange(-1)}
                      disabled={viewServings <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className={cn(
                      "min-w-[3rem] text-center font-medium",
                      viewServings !== recipe.servings && "text-primary"
                    )}>
                      {viewServings} servings
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleServingChange(1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {viewServings !== recipe.servings && (
                    <button
                      onClick={() => setViewServings(recipe.servings)}
                      className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                    >
                      reset
                    </button>
                  )}
                </div>
                {(recipe.prepTime > 0 || recipe.cookTime > 0) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>
                      {recipe.prepTime > 0 && `${recipe.prepTime}m prep`}
                      {recipe.prepTime > 0 && recipe.cookTime > 0 && ' · '}
                      {recipe.cookTime > 0 && `${recipe.cookTime}m cook`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="space-y-6 pt-2">
            {/* Pantry Availability Summary - only show when not editing */}
            {!isEditing && pantryStatuses.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Pantry Check
                  </h3>
                  {(missing.length > 0 || low.length > 0) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={handleAddMissingToGroceryList}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Add {missing.length + low.length} to list
                    </Button>
                  )}
                </div>
                
                {/* Status summary badges */}
                <div className="flex flex-wrap gap-2">
                  {inStock.length > 0 && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 gap-1">
                      <Check className="w-3 h-3" />
                      {inStock.length} in stock
                    </Badge>
                  )}
                  {frozen.length > 0 && (
                    <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-200 gap-1">
                      <Snowflake className="w-3 h-3" />
                      {frozen.length} frozen
                    </Badge>
                  )}
                  {low.length > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {low.length} low
                    </Badge>
                  )}
                  {missing.length > 0 && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                      <Package className="w-3 h-3" />
                      {missing.length} missing
                    </Badge>
                  )}
                </div>

                {/* Detailed list of missing/low items */}
                {(missing.length > 0 || low.length > 0 || frozen.length > 0) && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    {frozen.map((item, idx) => (
                      <div key={`frozen-${idx}`} className="flex items-center gap-2 text-xs">
                        <Snowflake className="w-3 h-3 text-sky-500" />
                        <span className="text-sky-600 font-medium">{item.name}</span>
                        <span className="text-muted-foreground">— frozen, thaw before use</span>
                      </div>
                    ))}
                    {low.map((item, idx) => (
                      <div key={`low-${idx}`} className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600 font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          — have {item.available} {item.unit}, need {Math.ceil(item.needed)}
                        </span>
                      </div>
                    ))}
                    {missing.map((item, idx) => (
                      <div key={`missing-${idx}`} className="flex items-center gap-2 text-xs">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">{item.name}</span>
                        <span className="text-muted-foreground">— not in pantry</span>
                      </div>
                    ))}
                  </div>
                )}

                {missing.length === 0 && low.length === 0 && frozen.length === 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    You have everything you need!
                  </p>
                )}
              </div>
            )}

            {/* Ingredients */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Ingredients</h3>
              {isEditing ? (
                <Textarea value={editIngredients} onChange={e => setEditIngredients(e.target.value)} placeholder="One ingredient per line (e.g., 2 cups flour)" rows={6} className="font-mono text-sm" />
              ) : (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, idx) => {
                    const scaledQty = getScaledQuantity(ing.quantity);
                    const isScaled = viewServings !== recipe.servings && ing.quantity > 0;
                    const statusUI = getIngredientStatusUI(ing.name);
                    const StatusIcon = statusUI?.icon;
                    
                    return (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          statusUI?.bg || "bg-primary/40"
                        )} />
                        <span className={cn(
                          "text-muted-foreground",
                          isScaled && "text-primary font-medium"
                        )}>
                          {scaledQty && `${scaledQty} `}
                          {ing.unit && `${ing.unit} `}
                        </span>
                        <span className="text-foreground flex-1">{ing.name}</span>
                        {StatusIcon && (
                          <StatusIcon className={cn("w-3.5 h-3.5", statusUI?.color)} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Instructions | Notes</h3>
              {isEditing ? (
                <Textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} placeholder="One step per line" rows={8} />
              ) : (
                <ol className="space-y-3">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-foreground pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Recipe Stories */}
            {!isEditing && (
              <RecipeStory recipeId={recipe.id} />
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t space-y-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSaveEdits}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <>
                  {onStartCooking && (
                    <Button 
                      className="w-full" 
                      onClick={() => onStartCooking(recipe, viewServings)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Cooking Mode ({viewServings} servings)
                    </Button>
                  )}
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Recipe
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{recipe.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This recipe will be permanently removed from your cookbook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecipeDetailSheet;
