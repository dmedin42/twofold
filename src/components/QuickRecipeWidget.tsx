import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChefHat, ArrowRight } from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';

const QuickRecipeWidget: React.FC = () => {
  const { inventory } = useHousehold();
  
  // Get expiring items that could use a recipe
  const expiringItems = inventory
    .filter(item => {
      if (item.quantity <= 0 || !item.expiryDate) return false;
      const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 5 && daysLeft >= 0;
    })
    .slice(0, 3);

  return (
    <div className="bg-card rounded-3xl p-5 border border-border shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Quick Recipe</h2>
          <p className="text-xs text-muted-foreground">AI-powered suggestions</p>
        </div>
      </div>

      {expiringItems.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use these items before they expire:
          </p>
          <div className="flex flex-wrap gap-2">
            {expiringItems.map(item => (
              <span 
                key={item.id}
                className="px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium"
              >
                {item.name}
              </span>
            ))}
          </div>
          <Link to="/recipes?tab=ai">
            <Button className="w-full mt-2" variant="default">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Recipe
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            No items expiring soon. Check out Chef Studio for recipe ideas!
          </p>
          <Link to="/recipes">
            <Button variant="outline" size="sm">
              <ChefHat className="w-4 h-4 mr-2" />
              Open Chef Studio
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default QuickRecipeWidget;
