import React from 'react';
import { GroceryListItem } from '@/types/household';
import { useHousehold } from '@/contexts/HouseholdContext';
import { cn } from '@/lib/utils';
import { Check, Trash2 } from 'lucide-react';
import UserBadge from './UserBadge';

interface GroceryItemProps {
  item: GroceryListItem;
}

const GroceryItem: React.FC<GroceryItemProps> = ({ item }) => {
  const { toggleGroceryItem, removeFromGroceryList } = useHousehold();

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border",
        "transition-all duration-200",
        item.isPurchased && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggleGroceryItem(item.id)}
        className={cn(
          "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          "transition-all duration-200",
          item.isPurchased 
            ? "bg-primary border-primary" 
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {item.isPurchased && (
          <Check className="w-4 h-4 text-primary-foreground" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span 
            className={cn(
              "font-medium text-foreground",
              item.isPurchased && "line-through text-muted-foreground"
            )}
          >
            {item.name}
          </span>
          <span className="text-sm text-muted-foreground">
            × {item.quantity} {item.unit}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Added by</span>
          <UserBadge uid={item.addedByUid} showName size="sm" />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => removeFromGroceryList(item.id)}
        className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default GroceryItem;
