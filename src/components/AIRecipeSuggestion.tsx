import React, { useState } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useGeminiChef } from '@/hooks/useGeminiChef';
import { getDaysUntilExpiry, getExpiryStatus } from '@/data/expiryUtils';
import { Sparkles, RefreshCw, ChefHat, Clock, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RecipeSuggestion {
  name: string;
  description?: string;
  usesIngredients: string[];
  prepTime: string;
  cookTime?: string;
  servings?: number;
  instructions?: string[];
  tips?: string;
}

const AIRecipeSuggestion: React.FC = () => {
  const { inventory } = useHousehold();
  const { generateRecipe, isLoading, error } = useGeminiChef();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<RecipeSuggestion | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Get items expiring soon (within 5 days)
  const expiringItems = inventory
    .map(item => ({
      ...item,
      status: getExpiryStatus(item.expiryDate),
      daysLeft: getDaysUntilExpiry(item.expiryDate),
    }))
    .filter(item => item.daysLeft <= 5 && item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const soonestExpiry = expiringItems[0]?.daysLeft ?? null;
  const expiringItemNames = expiringItems.map(item => item.name);

  const handleGenerateRecipe = async () => {
    if (expiringItemNames.length === 0) {
      toast({
        title: "No expiring items",
        description: "Add some items to your inventory to get recipe suggestions!",
        variant: "default",
      });
      return;
    }

    const result = await generateRecipe(expiringItemNames);
    
    if (result) {
      setSuggestion(result);
      setHasGenerated(true);
      toast({
        title: "Recipe generated!",
        description: `Try making "${result.name}" to use your expiring ingredients.`,
      });
    } else if (error) {
      toast({
        title: "Couldn't generate recipe",
        description: error,
        variant: "destructive",
      });
    }
  };

  if (inventory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">AI Zero-Waste Chef</h2>
            <p className="text-sm opacity-80">Powered by Gemini</p>
          </div>
        </div>
        <p className="text-sm opacity-90">
          Once you add ingredients to your pantry, I'll suggest recipes to help reduce food waste.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">AI "Zero Waste" Meal</h2>
          <p className="text-xs opacity-70">Powered by Gemini AI</p>
        </div>
      </div>
      
      {soonestExpiry !== null && expiringItemNames.length > 0 && (
        <div className="mb-4">
          <p className="text-sm opacity-80 mb-2">
            {expiringItemNames.length} item{expiringItemNames.length > 1 ? 's' : ''} expiring within 5 days:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {expiringItemNames.slice(0, 5).map((name, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium"
              >
                {name}
              </span>
            ))}
            {expiringItemNames.length > 5 && (
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                +{expiringItemNames.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recipe Card */}
      {suggestion && (
        <div className={cn(
          "bg-white/10 rounded-2xl p-4 mb-4 transition-all",
          isLoading && "opacity-50"
        )}>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg font-semibold">{suggestion.name}</h3>
            <Check className="w-5 h-5 text-green-300" />
          </div>
          
          {suggestion.description && (
            <p className="text-sm opacity-80 mb-3">{suggestion.description}</p>
          )}
          
          <p className="text-sm opacity-70 mb-3">
            Uses: {suggestion.usesIngredients.join(", ")}
          </p>
          
          <div className="flex items-center gap-4 text-xs opacity-70">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Prep: {suggestion.prepTime}</span>
            </div>
            {suggestion.cookTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Cook: {suggestion.cookTime}</span>
              </div>
            )}
            {suggestion.servings && (
              <span>Serves {suggestion.servings}</span>
            )}
          </div>

          {suggestion.tips && (
            <p className="mt-3 text-xs italic opacity-70 border-t border-white/10 pt-2">
              💡 {suggestion.tips}
            </p>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* No expiring items state */}
      {expiringItemNames.length === 0 && !suggestion && (
        <div className="bg-white/10 rounded-2xl p-4 mb-4">
          <p className="text-sm opacity-80">
            🎉 Great news! No items are expiring soon. Add items with expiry dates to get AI recipe suggestions.
          </p>
        </div>
      )}

      <Button
        onClick={handleGenerateRecipe}
        disabled={isLoading || expiringItemNames.length === 0}
        variant="secondary"
        className="w-full rounded-xl bg-white/20 hover:bg-white/30 text-white border-0"
      >
        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
        {isLoading 
          ? "Generating..." 
          : hasGenerated 
            ? "Generate Another Recipe" 
            : "Generate Rescue Recipe"
        }
      </Button>
    </div>
  );
};

export default AIRecipeSuggestion;
