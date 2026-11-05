import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Recipe } from '@/types/household';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Users, ChefHat, AlertCircle, ChevronRight, 
  Bookmark, ExternalLink, UtensilsCrossed 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PublicRecipe: React.FC = () => {
  // Support both /:slug/:shareCode and /recipe/:shareCode URL patterns
  const { shareCode, slug } = useParams<{ shareCode: string; slug?: string }>();

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['public-recipe', shareCode],
    queryFn: async () => {
      if (!shareCode) return null;
      
      const { data, error } = await (supabase as any)
        .from('recipes')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      return data as Recipe & { share_code: string; is_public: boolean };
    },
    enabled: !!shareCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-full mb-6" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Recipe Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This recipe may be private or the link is invalid.
          </p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">
              Go to Twofold Kitchen
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Twofold Kitchen
              </span>
              <h1 className="font-display text-lg font-semibold text-foreground leading-tight">
                Shared Recipe
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Recipe Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            {recipe.name}
          </h1>
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}
          
          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {recipe.tags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="bg-accent text-accent-foreground rounded-full"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex gap-4 flex-wrap">
          {recipe.prepTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Prep: {recipe.prepTime} min</span>
            </div>
          )}
          {recipe.cookTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Cook: {recipe.cookTime} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>

        {/* Ingredients */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-foreground">
                    {typeof ingredient === 'string' 
                      ? ingredient 
                      : `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <h2 className="font-semibold text-foreground mb-3">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Save CTA */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" />
                  Save to Your Kitchen
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Join Twofold Kitchen to save recipes and track your pantry
                </p>
              </div>
              <Link to="/auth">
                <Button size="sm" className="rounded-xl shrink-0">
                  Sign Up Free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PublicRecipe;
