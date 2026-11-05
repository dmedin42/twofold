import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Plus, Check, Star, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STAPLE_THRESHOLD, PinnedItem } from '@/types/household';

// Emoji mapping for dynamic staples
const categoryEmojis: Record<string, string> = {
  'Dairy': '🥛',
  'Produce': '🥬',
  'Meat': '🍖',
  'Frozen': '🧊',
  'Pantry': '🥫',
  'Bakery': '🍞',
  'Beverages': '🥤',
};

// Common item emoji lookup
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

interface QuickAddItem {
  name: string;
  category: string;
  unit: string;
  shelfLifeDays?: number;
  quantity?: number;
  isPinned: boolean;
}

const PredictiveGrid: React.FC = () => {
  const { activeUser, addInventoryItem, inventory, getPinnedItems, togglePinItem, getLifetimeUsageCount } = useHousehold();
  const [addedItems, setAddedItems] = React.useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = React.useState<Set<string>>(new Set());

  const pinnedItems = getPinnedItems();
  const pinnedNames = pinnedItems.map(p => p.name.toLowerCase().trim());

  // Get user's frequent staples (items with lifetime usageCount > STAPLE_THRESHOLD) OR pinned items
  const quickAddItems = React.useMemo(() => {
    const itemMap = new Map<string, QuickAddItem>();
    
    // First add all pinned items (they persist even when deleted from inventory)
    pinnedItems.forEach(pinned => {
      const key = pinned.name.toLowerCase().trim();
      const lifetimeCount = getLifetimeUsageCount(pinned.name);
      itemMap.set(key, {
        name: pinned.name,
        category: pinned.category,
        unit: pinned.unit,
        shelfLifeDays: pinned.shelfLifeDays,
        quantity: Math.max(999, lifetimeCount), // Pinned items have high priority
        isPinned: true,
      });
    });

    // Build a map of best item metadata by name from inventory
    const itemMetadata = new Map<string, { category: string; unit: string; shelfLifeDays?: number }>();
    inventory.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!itemMetadata.has(key)) {
        itemMetadata.set(key, {
          category: item.category,
          unit: item.unit,
          shelfLifeDays: item.shelfLifeDays,
        });
      }
    });

    // Check all unique item names for lifetime usage
    const checkedNames = new Set<string>();
    inventory.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (checkedNames.has(key)) return;
      checkedNames.add(key);
      
      const lifetimeCount = getLifetimeUsageCount(item.name);
      const isPinned = pinnedNames.includes(key);
      
      if (lifetimeCount > STAPLE_THRESHOLD) {
        const existing = itemMap.get(key);
        // Update if not already pinned with higher usage count
        if (!existing || (!existing.isPinned && lifetimeCount > (existing.quantity || 0))) {
          itemMap.set(key, {
            name: item.name,
            category: item.category,
            unit: item.unit,
            shelfLifeDays: item.shelfLifeDays,
            quantity: lifetimeCount,
            isPinned,
          });
        } else if (existing.isPinned) {
          // Update metadata for pinned items from latest inventory
          itemMap.set(key, {
            ...existing,
            shelfLifeDays: item.shelfLifeDays || existing.shelfLifeDays,
          });
        }
      }
    });

    // Sort: pinned first, then by usage count
    return Array.from(itemMap.values())
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.quantity || 0) - (a.quantity || 0);
      });
  }, [inventory, pinnedItems, pinnedNames, getLifetimeUsageCount]);

  const handleStapleAdd = async (staple: QuickAddItem) => {
    if (!activeUser) return;
    
    // Prevent duplicate submissions
    if (pendingItems.has(staple.name)) return;
    setPendingItems(prev => new Set([...prev, staple.name]));

    const shelfLifeDays = staple.shelfLifeDays || 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);
    const batchId = `batch-${Date.now()}`;

    try {
      await addInventoryItem({
        name: staple.name,
        category: staple.category,
        quantity: 1,
        unit: staple.unit,
        expiryDate: expiryDate.toISOString().split('T')[0],
        ownerUid: activeUser.uid,
        lastBoughtByUid: activeUser.uid,
        isPrivate: false,
        batchId,
        shelfLifeDays,
      });

      setAddedItems(prev => new Set([...prev, staple.name]));
      toast.success(`Added ${staple.name} to pantry`);
    } finally {
      // Clear pending after a short delay to prevent rapid re-clicks
      setTimeout(() => {
        setPendingItems(prev => {
          const next = new Set(prev);
          next.delete(staple.name);
          return next;
        });
      }, 1000);
    }

    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(staple.name);
        return next;
      });
    }, 2000);
  };

  const handleTogglePin = (e: React.MouseEvent, staple: QuickAddItem) => {
    e.stopPropagation();
    const pinnedItem: PinnedItem = {
      name: staple.name,
      category: staple.category,
      unit: staple.unit,
      shelfLifeDays: staple.shelfLifeDays,
    };
    togglePinItem(pinnedItem);
    toast.success(staple.isPinned ? `Unpinned ${staple.name}` : `Pinned ${staple.name} to Quick Add`);
  };

  const getEmoji = (category: string, name: string) => {
    const match = itemEmojis[name.toLowerCase()];
    if (match) return match;
    return categoryEmojis[category] || '📦';
  };

  if (quickAddItems.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No frequent items yet</p>
        <p className="text-xs mt-1">Items you add more than 5 times will appear here for quick access</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-primary" />
        Quick Add Your Items
        <span className="text-xs text-muted-foreground font-normal ml-auto">Hover to pin</span>
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {quickAddItems.slice(0, 30).map((staple) => {
          const isAdded = addedItems.has(staple.name);
          
          return (
            <Button
              key={staple.name}
              variant="outline"
              onClick={() => handleStapleAdd(staple)}
              disabled={!activeUser || pendingItems.has(staple.name)}
              className={cn(
                "h-auto py-3 px-2 flex flex-col items-center gap-1 rounded-xl transition-all border-primary/30 bg-primary/5 relative group",
                isAdded && "bg-primary/20 border-primary text-primary",
                staple.isPinned && "ring-2 ring-primary/50",
                pendingItems.has(staple.name) && "opacity-50 cursor-not-allowed"
              )}
            >
              {staple.isPinned && (
                <Pin className="w-3 h-3 text-primary absolute top-1 right-1" />
              )}
              <span className="text-2xl">{getEmoji(staple.category, staple.name)}</span>
              <span className="text-xs font-medium text-center leading-tight truncate w-full">
                {staple.name}
              </span>
              {isAdded ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Plus className="w-3 h-3 text-muted-foreground" />
              )}
              {/* Pin/Unpin button on hover */}
              <button
                onClick={(e) => handleTogglePin(e, staple)}
                className="absolute -top-1 -left-1 p-1 bg-background rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-border"
              >
                {staple.isPinned ? (
                  <PinOff className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Pin className="w-3 h-3 text-primary" />
                )}
              </button>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default PredictiveGrid;