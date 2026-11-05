import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';

import RecipeDetailSheet from '@/components/RecipeDetailSheet';
import CookingModeSheet from '@/components/CookingModeSheet';
import RescueBridgeWidget from '@/components/RescueBridgeWidget';
import { RecipeImportDialog } from '@/components/RecipeImportDialog';
import { ChefHat, Plus, BookOpen, Sparkles, Search, Heart, Tag, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Recipe } from '@/types/household';
import { RECIPE_FILTERS } from '@/types/recipe';

type TabView = 'recipes' | 'ai';

const ChefStudio: React.FC = () => {
  const { savedRecipes, toggleRecipeLike, removeSavedRecipe, updateSavedRecipe } = useHousehold();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabView>(() => {
    const tab = searchParams.get('tab');
    return tab === 'ai' ? 'ai' : 'recipes';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [cookingServings, setCookingServings] = useState(4);

  // Get initial note and taskId from query params
  const initialNote = searchParams.get('note') || undefined;
  const pendingTaskId = searchParams.get('taskId') || undefined;

  // Auto-switch to AI tab if taskId is present
  useEffect(() => {
    if (pendingTaskId) {
      setActiveTab('ai');
    }
  }, [pendingTaskId]);

  const handleStartCookingMode = (recipe: Recipe, servings?: number) => {
    setCookingServings(servings || recipe.servings);
    setSelectedRecipe(recipe);
    setIsCookingMode(true);
  };

  // 1. Extract All Unique Tags
  // Merge predefined filter labels with user-created tags
  const predefinedLabels = RECIPE_FILTERS.map(f => f.label);
  const userTags = Array.from(new Set(savedRecipes.flatMap(r => r.tags || []))).sort();
  const allTags = Array.from(new Set([...predefinedLabels, ...userTags]));
  
  // Count recipes per tag for dimming empty ones
  const tagCounts = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = savedRecipes.filter(r => (r.tags || []).includes(tag)).length;
    return acc;
  }, {});

  // 2. Powerful Filtering Logic
  const filteredRecipes = savedRecipes.filter(recipe => {
    const query = searchQuery.toLowerCase();
    
    // Search in Name OR Ingredients OR Tags
    const matchesSearch = 
      recipe.name.toLowerCase().includes(query) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query)) ||
      (recipe.tags && recipe.tags.some(t => t.toLowerCase().includes(query)));

    const matchesLiked = showLikedOnly ? recipe.isLiked : true;
    const matchesTag = selectedTagFilter ? (recipe.tags || []).includes(selectedTagFilter) : true;

    return matchesSearch && matchesLiked && matchesTag;
  });

  const tabs = [
    { id: 'recipes' as TabView, label: 'My Recipes', icon: BookOpen },
    { id: 'ai' as TabView, label: 'AI Chef', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navigation />
      
      <main className="container px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground mb-1">Chef's Studio</h1>
            <p className="text-sm text-muted-foreground">Your digital kitchen brain</p>
          </div>
          
          {/* NEW: Universal Add Button */}
          <RecipeImportDialog>
            <Button size="icon" className="h-10 w-10 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-5 h-5" />
            </Button>
          </RecipeImportDialog>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                activeTab === id ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'recipes' && (
          <div className="space-y-6">
            
            {/* Search & Filter Bar */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, ingredient, or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl bg-card border-border"
                  />
                </div>
                <button
                  onClick={() => setShowLikedOnly(!showLikedOnly)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                    showLikedOnly ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Heart className={cn("w-4 h-4", showLikedOnly && "fill-current")} />
                </button>
              </div>

              {/* Tag Filter Scroller - always show with predefined + user tags */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                    selectedTagFilter === null 
                      ? "bg-foreground text-background border-foreground" 
                      : "bg-card border-border text-muted-foreground"
                  )}
                >
                  All
                </button>
                {allTags.map(tag => {
                  const count = tagCounts[tag] || 0;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTagFilter(tag === selectedTagFilter ? null : tag)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                        tag === selectedTagFilter 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : count > 0
                            ? "bg-card border-border text-muted-foreground"
                            : "bg-card border-border text-muted-foreground/40"
                      )}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      {count > 0 && <span className="ml-0.5 text-[10px] opacity-60">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipe Grid */}
            {filteredRecipes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredRecipes.map((recipe) => (
                  <button 
                    key={recipe.id} 
                    onClick={() => setSelectedRecipe(recipe)} 
                    className="bg-card rounded-2xl border border-border p-4 hover:shadow-soft transition-all text-left group active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                        {recipe.name}
                      </h4>
                      <span 
                        onClick={(e) => { e.stopPropagation(); toggleRecipeLike(recipe.id); }} 
                        className={cn(
                          "p-1.5 rounded-lg transition-colors", 
                          recipe.isLiked ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", recipe.isLiked && "fill-current")} />
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {recipe.description || 'Delicious homemade meal.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium">
                        {recipe.servings} servings
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {(recipe.tags || []).slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-1 bg-accent text-accent-foreground rounded-full font-semibold border border-primary/20">
                            {tag}
                          </span>
                        ))}
                        {(recipe.tags?.length || 0) > 3 && (
                          <span className="text-[10px] px-2 py-1 bg-muted/50 text-muted-foreground rounded-full font-medium">
                            +{(recipe.tags?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground">No recipes found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or add a new recipe.
                </p>
              </div>
            )}
            
            
          </div>
        )}

        {/* AI Chef Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in">
            <RescueBridgeWidget 
              initialNote={initialNote}
              pendingTaskId={pendingTaskId}
              onRecipeSaved={(recipe) => console.log("AI Saved", recipe.title)} 
            />
          </div>
        )}
      </main>

      {/* Sheets & Dialogs */}
      <RecipeDetailSheet
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe && !isCookingMode}
        onClose={() => setSelectedRecipe(null)}
        onToggleLike={toggleRecipeLike}
        onDelete={removeSavedRecipe}
        onUpdate={updateSavedRecipe}
        onStartCooking={handleStartCookingMode}
      />

      <CookingModeSheet
        recipe={selectedRecipe}
        isOpen={isCookingMode}
        onClose={() => { setIsCookingMode(false); setSelectedRecipe(null); }}
        scaledServings={cookingServings}
      />
    </div>
  );
};

export default ChefStudio;
