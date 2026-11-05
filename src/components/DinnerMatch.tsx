import React, { useState, useCallback } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ThumbsUp, ThumbsDown, Loader2, RefreshCw, Heart, BookOpen, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/operatorTracking';
import { StagedRecipe } from '@/types/recipe';

interface MatchRecipe {
  name: string;
  description: string;
  prepTime: number;
}

const DinnerMatch: React.FC = () => {
  const { inventory, addSavedRecipe } = useHousehold();
  const [recipes, setRecipes] = useState<MatchRecipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState<Record<number, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [expandingIndex, setExpandingIndex] = useState<number | null>(null);

  const generateRecipes = useCallback(async () => {
    const pantryItems = inventory
      .filter(i => i.quantity > 0)
      .map(i => i.name)
      .slice(0, 10);

    if (pantryItems.length < 3) {
      toast.error('Add at least 3 items to your pantry first');
      return;
    }

    setIsGenerating(true);
    setCurrentIndex(0);
    setVotes({});
    setIsComplete(false);

    try {
      const personality = localStorage.getItem('twofold_chef_personality') || 'encouraging';
      const { data, error } = await supabase.functions.invoke('dinner-match', {
        body: {
          ingredients: pantryItems,
          taskType: 'dinner_match',
          servings: 4,
          tone: personality,
        },
      });

      if (error) throw error;

      let parsed: MatchRecipe[] = [];
      if (Array.isArray(data)) {
        parsed = data.map((r: any) => ({
          name: r.name || 'Mystery Meal',
          description: r.description || '',
          prepTime: r.prep_time || r.metrics?.prep_time || 20,
        }));
      } else if (data?.name) {
        parsed = [
          { name: data.name, description: data.description || '', prepTime: data.metrics?.prep_time || 20 },
          { name: `Quick ${pantryItems[0]} Bowl`, description: `A simple bowl featuring ${pantryItems[0]}`, prepTime: 15 },
          { name: `${pantryItems[1]} Stir-Fry`, description: `A fast stir-fry with ${pantryItems[1]}`, prepTime: 20 },
        ];
      }

      if (parsed.length === 0) {
        parsed = [
          { name: `${pantryItems[0]} Special`, description: `Make something great with ${pantryItems[0]}`, prepTime: 20 },
          { name: `Quick ${pantryItems[1]} Bowl`, description: `A simple bowl featuring ${pantryItems[1]}`, prepTime: 15 },
          { name: `${pantryItems[2]} Stir-Fry`, description: `A fast stir-fry with ${pantryItems[2]}`, prepTime: 20 },
        ];
      }

      setRecipes(parsed.slice(0, 3));
    } catch (err: any) {
      console.error('Dinner Match generation error:', err);
      trackEvent({ type: 'api_error', name: 'dinner-match', error: err?.message || 'Dinner Match generation failed', statusCode: 500 });
      toast.error('Failed to generate meal ideas');
    } finally {
      setIsGenerating(false);
    }
  }, [inventory]);

  const handleVote = (liked: boolean) => {
    setVotes(prev => ({ ...prev, [currentIndex]: liked }));

    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
      const likedRecipes = Object.entries({ ...votes, [currentIndex]: liked })
        .filter(([, v]) => v)
        .map(([idx]) => recipes[Number(idx)]?.name)
        .filter(Boolean);

      if (likedRecipes.length > 0) {
        toast.success(`It's a match! 🎉`, {
          description: `You liked: ${likedRecipes.join(', ')}`,
        });
      } else {
        toast('No matches this round. Try again?');
      }
    }
  };

  const handleExpandRecipe = async (recipe: MatchRecipe, idx: number) => {
    setExpandingIndex(idx);

    const pantryItems = inventory
      .filter(i => i.quantity > 0)
      .map(i => i.name)
      .slice(0, 10);

    try {
      const personality = localStorage.getItem('twofold_chef_personality') || 'encouraging';
      const { data, error } = await supabase.functions.invoke('rescue-recipe', {
        body: {
          ingredients: pantryItems,
          customNote: `Create a full recipe for: "${recipe.name}" — ${recipe.description}`,
          servings: 4,
          tone: personality,
        },
      });

      if (error) throw error;

      const ingredientsList = data?.ingredients
        ? data.ingredients.map((ing: any) => ({
            item: ing.item, qty: ing.qty, unit: ing.unit, notes: ''
          }))
        : [];

      const prepTime = data?.metrics?.prep_time ?? recipe.prepTime;
      const cookTime = data?.metrics?.cook_time ?? 20;
      const servings = data?.metrics?.servings ?? 4;

      const staged: StagedRecipe = {
        title: data?.name || recipe.name,
        description: data?.description || recipe.description,
        servings,
        ingredients: ingredientsList,
        instructions: (data?.instructions || []).map((inst: any) =>
          typeof inst === 'string' ? inst : (inst as any).instruction || String(inst)
        ),
        metrics: { prep_time: prepTime, cook_time: cookTime },
      };

      addSavedRecipe(staged, ['Dinner Match']);
      toast.success(`"${staged.title}" saved to cookbook! 📖`);
    } catch (err: any) {
      console.error('Recipe expansion error:', err);
      trackEvent({ type: 'api_error', name: 'rescue-recipe', error: err?.message || 'DinnerMatch recipe expansion failed', statusCode: 500 });
      toast.error('Failed to generate full recipe');
    } finally {
      setExpandingIndex(null);
    }
  };

  const likedRecipes = isComplete
    ? Object.entries(votes)
        .filter(([, v]) => v)
        .map(([idx]) => ({ recipe: recipes[Number(idx)], idx: Number(idx) }))
        .filter(r => r.recipe)
    : [];

  const currentRecipe = recipes[currentIndex];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-display">Dinner Match</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateRecipes}
            disabled={isGenerating}
            className="h-8"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {recipes.length === 0 && !isGenerating ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Swipe on AI meal ideas based on your pantry
            </p>
            <Button size="sm" onClick={generateRecipes}>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Ideas
            </Button>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Thinking up meals...</p>
          </div>
        ) : isComplete ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              {likedRecipes.length} of {recipes.length} liked
            </p>

            {likedRecipes.length > 0 ? (
              <div className="space-y-2">
                {likedRecipes.map(({ recipe, idx }) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">~{recipe.prepTime} min</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2 shrink-0 gap-1"
                      disabled={expandingIndex !== null}
                      onClick={() => handleExpandRecipe(recipe, idx)}
                    >
                      {expandingIndex === idx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5" />
                      )}
                      {expandingIndex === idx ? 'Saving...' : 'Add to Cookbook'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="text-center">
              <Button variant="outline" size="sm" onClick={generateRecipes}>
                <RefreshCw className="w-4 h-4 mr-1" />
                New Round
              </Button>
            </div>
          </div>
        ) : currentRecipe ? (
          <div className="space-y-4">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {recipes.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === currentIndex ? "bg-primary" :
                    idx < currentIndex ? (votes[idx] ? "bg-accent" : "bg-destructive") :
                    "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Recipe Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border text-center">
              <p className="font-display text-lg font-semibold text-foreground mb-1">{currentRecipe.name}</p>
              <p className="text-sm text-muted-foreground mb-2">{currentRecipe.description}</p>
              <p className="text-xs text-muted-foreground">~{currentRecipe.prepTime} min prep</p>
            </div>

            {/* Vote Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0 border-destructive/30 hover:bg-destructive/10"
                onClick={() => handleVote(false)}
              >
                <ThumbsDown className="w-6 h-6 text-destructive" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0 border-primary/30 hover:bg-primary/10"
                onClick={() => handleVote(true)}
              >
                <ThumbsUp className="w-6 h-6 text-primary" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DinnerMatch;
