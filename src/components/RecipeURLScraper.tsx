import React, { useState } from 'react';
import { Link2, Loader2, ChefHat, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StagedRecipe } from '@/types/recipe';

interface RecipeURLScraperProps {
  onRecipeScraped: (recipe: StagedRecipe) => void;
}

const RecipeURLScraper: React.FC<RecipeURLScraperProps> = ({ onRecipeScraped }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error('Please enter a recipe URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-recipe', {
        body: { url: url.trim() }
      });

      if (error) throw error;

      if (!data || !data.title) {
        throw new Error('Could not extract recipe from this page');
      }

      // Map to StagedRecipe format
      const stagedRecipe: StagedRecipe = {
        title: data.title,
        description: data.description || '',
        servings: data.servings || 4,
        ingredients: (data.ingredients || []).map((ing: any) => ({
          item: ing.item || ing.name || '',
          qty: ing.qty || ing.quantity || 1,
          unit: ing.unit || ''
        })),
        instructions: data.instructions || [],
        metrics: {
          prep_time: data.metrics?.prep_time || 0,
          cook_time: data.metrics?.cook_time || 0
        }
      };

      toast.success(`Extracted "${stagedRecipe.title}"!`);
      onRecipeScraped(stagedRecipe);
      setUrl('');
    } catch (err: unknown) {
      console.error('Scrape error:', err);
      const message = err instanceof Error ? err.message : 'Failed to scrape recipe';
      toast.error('Scrape failed', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Paste Recipe URL</h3>
          <p className="text-xs text-muted-foreground">We'll extract all the details</p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          type="url"
          placeholder="https://example.com/recipe..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleScrape()}
          className="w-full rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-colors h-12"
          disabled={isLoading}
        />
        <Button
          onClick={handleScrape}
          disabled={isLoading || !url.trim()}
          className="w-full rounded-xl h-12 font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reading recipe...
            </>
          ) : (
            <>
              <ChefHat className="w-4 h-4 mr-2" />
              Import Recipe
            </>
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground animate-pulse">
            Chef is reading the recipe page...
          </p>
        </div>
      )}
    </div>
  );
};

export default RecipeURLScraper;
