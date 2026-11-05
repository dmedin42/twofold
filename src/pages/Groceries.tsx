import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import Navigation from '@/components/Navigation';
import GroceryItem from '@/components/GroceryItem';
import AddGroceryForm from '@/components/AddGroceryForm';
import { ShoppingCart, CheckCircle, Sparkles, Plus } from 'lucide-react';
import { STAPLE_THRESHOLD, PinnedItem } from '@/types/household';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Emoji mapping for suggestions
const itemEmojis: Record<string, string> = {
  'milk': '🥛',
  'eggs': '🥚',
  'bread': '🍞',
  'butter': '🧈',
  'cheese': '🧀',
  'chicken': '🍗',
  'ground beef': '🥩',
  'bananas': '🍌',
  'apples': '🍎',
  'lettuce': '🥬',
  'tomatoes': '🍅',
  'onions': '🧅',
  'potatoes': '🥔',
  'carrots': '🥕',
  'yogurt': '🥄',
  'orange juice': '🍊',
};

const categoryEmojis: Record<string, string> = {
  'Dairy': '🥛',
  'Produce': '🥬',
  'Meat': '🍖',
  'Frozen': '🧊',
  'Pantry': '🥫',
  'Bakery': '🍞',
  'Beverages': '🥤',
};

interface SuggestedItem {
  name: string;
  category: string;
  unit: string;
  usageCount?: number;
  isPinned: boolean;
}

const Groceries: React.FC = () => {
  // Use groceryList directly from HouseholdContext (backed by Supabase)
  const { activeUser, inventory, groceryList, addToGroceryList, getPinnedItems, getLifetimeUsageCount } = useHousehold();

  const pendingItems = groceryList.filter(item => !item.isPurchased);
  const purchasedItems = groceryList.filter(item => item.isPurchased);

  const pinnedItems = getPinnedItems();
  const pinnedNames = pinnedItems.map(p => p.name.toLowerCase().trim());

  // Get frequent staples (lifetime usageCount > STAPLE_THRESHOLD) OR pinned items that are NOT in pantry (qty <= 0 or not present)
  const suggestedItems = React.useMemo(() => {
    // Build map of items to suggest
    const suggestionMap = new Map<string, SuggestedItem>();
    
    // First add all pinned items (they should appear even if deleted from inventory)
    pinnedItems.forEach(pinned => {
      const key = pinned.name.toLowerCase().trim();
      const lifetimeCount = getLifetimeUsageCount(pinned.name);
      suggestionMap.set(key, {
        name: pinned.name,
        category: pinned.category,
        unit: pinned.unit,
        usageCount: Math.max(999, lifetimeCount), // High priority for pinned
        isPinned: true,
      });
    });

    // Check all unique item names for lifetime usage
    const checkedNames = new Set<string>();
    inventory.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (checkedNames.has(key)) return;
      checkedNames.add(key);
      
      const lifetimeCount = getLifetimeUsageCount(item.name);
      const isPinned = pinnedNames.includes(key);
      
      if (lifetimeCount > STAPLE_THRESHOLD || isPinned) {
        const existing = suggestionMap.get(key);
        if (!existing || (lifetimeCount > (existing.usageCount || 0) && !existing.isPinned)) {
          suggestionMap.set(key, {
            name: item.name,
            category: item.category,
            unit: item.unit,
            usageCount: lifetimeCount,
            isPinned,
          });
        }
      }
    });

    // Get items currently in pantry with qty > 0
    const inPantry = new Set(
      inventory
        .filter(item => item.quantity > 0)
        .map(item => item.name.toLowerCase().trim())
    );

    // Get items already in grocery list
    const inGroceryList = new Set(
      groceryList
        .filter(item => !item.isPurchased)
        .map(item => item.name.toLowerCase().trim())
    );

    // Return staples/pinned that are NOT in pantry AND NOT already in grocery list
    return Array.from(suggestionMap.values())
      .filter(item => {
        const key = item.name.toLowerCase().trim();
        return !inPantry.has(key) && !inGroceryList.has(key);
      })
      .sort((a, b) => {
        // Pinned items first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      });
  }, [inventory, groceryList, pinnedItems, pinnedNames, getLifetimeUsageCount]);

  const handleAddSuggestion = (item: SuggestedItem) => {
    if (!activeUser) return;

    addToGroceryList({
      name: item.name,
      quantity: 1,
      unit: item.unit,
      addedByUid: activeUser.uid,
    });

    toast.success(`Added ${item.name} to grocery list`);
  };

  const getEmoji = (category: string, name: string) => {
    const match = itemEmojis[name.toLowerCase()];
    if (match) return match;
    return categoryEmojis[category] || '📦';
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navigation />
      
      <main className="container px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground mb-1">
              Grocery List
            </h1>
            <p className="text-sm text-muted-foreground">
              {pendingItems.length} items to buy
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-secondary" />
          </div>
        </div>

        {/* Add Form */}
        {activeUser ? (
          <div className="mb-6">
            <AddGroceryForm />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-muted/50 border border-border mb-6 text-center">
            <p className="text-sm text-muted-foreground">
              Select a profile to add items to the list
            </p>
          </div>
        )}

        {/* Suggested Items (missing frequent staples or pinned items) */}
        {suggestedItems.length > 0 && activeUser && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Running Low On Staples
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestedItems.slice(0, 6).map((item) => (
                <Button
                  key={item.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSuggestion(item)}
                  className="gap-1.5 rounded-full bg-background hover:bg-primary/10 border-primary/30"
                >
                  <span>{getEmoji(item.category, item.name)}</span>
                  <span>{item.name}</span>
                  <Plus className="w-3 h-3 text-primary" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              To Buy
            </h2>
            <div className="space-y-3">
              {pendingItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-float-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <GroceryItem item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchased Items */}
        {purchasedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Purchased
            </h2>
            <div className="space-y-3">
              {purchasedItems.map((item) => (
                <GroceryItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {groceryList.length === 0 && suggestedItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Your grocery list is empty</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Groceries;
