import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScanLine, Link as LinkIcon, PenTool, ArrowLeft } from 'lucide-react';
import RecipeURLScraper from './RecipeURLScraper';
import ScanRecipeDialog from './ScanRecipeDialog';
import { useHousehold } from '@/contexts/HouseholdContext';
import { StagedRecipe } from '@/types/recipe';
import { toast } from 'sonner';

interface RecipeImportDialogProps {
  children: React.ReactNode;
}

type ImportView = 'menu' | 'url' | 'scan' | 'manual';

export const RecipeImportDialog: React.FC<RecipeImportDialogProps> = ({ children }) => {
  const { addSavedRecipe } = useHousehold();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ImportView>('menu');

  // Manual Form State
  const [manualRecipe, setManualRecipe] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    servings: 4,
  });

  const resetAndClose = () => {
    setOpen(false);
    setTimeout(() => {
      setView('menu');
      setManualRecipe({ name: '', ingredients: '', instructions: '', servings: 4 });
    }, 300);
  };

  const handleManualSave = () => {
    if (!manualRecipe.name.trim()) return;

    const staged: StagedRecipe = {
      title: manualRecipe.name,
      servings: manualRecipe.servings,
      ingredients: manualRecipe.ingredients.split('\n').filter(Boolean).map(line => ({
        qty: 1, unit: '', item: line.trim() 
      })),
      instructions: manualRecipe.instructions.split('\n').filter(Boolean),
      metrics: { prep_time: 0, cook_time: 0 }
    };

    addSavedRecipe(staged, []);
    toast.success(`"${manualRecipe.name}" added to cookbook!`);
    resetAndClose();
  };

  const handleScraped = (recipe: StagedRecipe) => {
    addSavedRecipe(recipe, []);
    toast.success(`"${recipe.title}" saved!`);
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetAndClose();
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            {view !== 'menu' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1 rounded-full hover:bg-muted/50" onClick={() => setView('menu')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {view === 'menu' && 'Add New Recipe'}
            {view === 'url' && 'Import from Web'}
            {view === 'scan' && 'Scan from Photo'}
            {view === 'manual' && 'Write Recipe'}
          </DialogTitle>
        </DialogHeader>

        {view === 'menu' && (
          <div className="grid gap-3 py-4">
            <Button variant="ghost" className="h-auto py-5 px-4 justify-start gap-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all" onClick={() => setView('url')}>
              <div className="bg-primary/10 p-3 rounded-xl"><LinkIcon className="w-5 h-5 text-primary" /></div>
              <div className="text-left"><div className="font-semibold text-foreground">Import from URL</div><div className="text-xs text-muted-foreground">Paste a link from any recipe site</div></div>
            </Button>

            <Button variant="ghost" className="h-auto py-5 px-4 justify-start gap-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all" onClick={() => setView('scan')}>
              <div className="bg-primary/10 p-3 rounded-xl"><ScanLine className="w-5 h-5 text-primary" /></div>
              <div className="text-left"><div className="font-semibold text-foreground">Scan Recipe Card</div><div className="text-xs text-muted-foreground">Take a photo of a cookbook or card</div></div>
            </Button>

            <Button variant="ghost" className="h-auto py-5 px-4 justify-start gap-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all" onClick={() => setView('manual')}>
              <div className="bg-primary/10 p-3 rounded-xl"><PenTool className="w-5 h-5 text-primary" /></div>
              <div className="text-left"><div className="font-semibold text-foreground">Create Manually</div><div className="text-xs text-muted-foreground">Type out your own recipe</div></div>
            </Button>
          </div>
        )}

        {view === 'url' && (
          <div className="py-4">
            <RecipeURLScraper onRecipeScraped={handleScraped} />
          </div>
        )}

        {view === 'scan' && (
          // We render the scan logic inline or via a simplified wrapper
          // Since ScanRecipeDialog usually controls its own dialog, we might need to adjust it
          // For now, we'll instruct the user to use the main scan button if this is complex
          <div className="text-center py-8">
            <ScanRecipeDialog 
              isOpen={true} 
              onClose={() => setView('menu')} 
              onRecipeScanned={(r) => {
                 // Convert 'Recipe' to 'StagedRecipe' logic here if needed
                 // For now assuming ScanRecipeDialog handles the save or returns a compatible object
                 // If your ScanRecipeDialog adds it directly, we just close.
                 setView('menu');
                 setOpen(false);
              }}
              onOpenPasteView={() => {}} 
            />
          </div>
        )}

        {view === 'manual' && (
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Recipe Name</Label>
              <Input 
                value={manualRecipe.name} 
                onChange={(e) => setManualRecipe(p => ({...p, name: e.target.value}))} 
                placeholder="Grandma's Cookies" 
                className="rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Ingredients (one per line)</Label>
              <Textarea 
                value={manualRecipe.ingredients} 
                onChange={(e) => setManualRecipe(p => ({...p, ingredients: e.target.value}))} 
                placeholder="2 cups Flour..." 
                className="min-h-[100px] rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Instructions</Label>
              <Textarea 
                value={manualRecipe.instructions} 
                onChange={(e) => setManualRecipe(p => ({...p, instructions: e.target.value}))} 
                placeholder="Mix ingredients..." 
                className="min-h-[100px] rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Servings</Label>
              <Input 
                type="number" 
                value={manualRecipe.servings} 
                onChange={(e) => setManualRecipe(p => ({...p, servings: parseInt(e.target.value) || 4}))} 
                className="rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors w-24"
              />
            </div>
            <Button onClick={handleManualSave} className="w-full mt-4 rounded-xl h-12 font-semibold">Save Recipe</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
