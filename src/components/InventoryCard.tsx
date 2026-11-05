import React, { useState } from 'react';
import { InventoryItem } from '@/types/household';
import { getExpiryStatus, getDaysUntilExpiry } from '@/data/expiryUtils';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useStorageTips } from '@/hooks/useStorageTips';
import { cn } from '@/lib/utils';
import { Lock, Clock, AlertTriangle, XCircle, Lightbulb, Loader2, Snowflake, PackageMinus, Pencil, Trash } from 'lucide-react';
import { FREEZABLE_CATEGORIES } from '@/types/household';
import UserBadge from './UserBadge';
import EditInventoryDialog from './EditInventoryDialog';
import ThrowAwayDialog from './ThrowAwayDialog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InventoryCardProps {
  item: InventoryItem;
  onClick?: () => void;
}

const categoryEmojis: Record<string, string> = {
  Dairy: '🥛',
  Produce: '🥬',
  Bakery: '🍞',
  Snacks: '🍫',
  Pantry: '🫙',
  Meat: '🥩',
  Frozen: '🧊',
  Beverages: '🧃',
};

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onClick }) => {
  const { getUserById, activeUser, removeInventoryItem, toggleFreezeItem, markItemGone, updateInventoryItem, throwAwayItem } = useHousehold();
  const { getStorageTip, isLoading } = useStorageTips();
  const [showTip, setShowTip] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showThrowAway, setShowThrowAway] = useState(false);
  const [storageTip, setStorageTip] = useState<{ tip: string; expectedShelfLife: string; source?: string } | null>(null);
  
  // Check if item is out of stock
  const isOutOfStock = item.quantity <= 0;
  
  // Frozen items don't expire - show as fresh
  const status = item.isFrozen ? 'fresh' : isOutOfStock ? 'expired' : getExpiryStatus(item.expiryDate);
  const daysLeft = getDaysUntilExpiry(item.expiryDate);
  const owner = item.ownerUid !== 'global' ? getUserById(item.ownerUid) : null;
  const canFreeze = (FREEZABLE_CATEGORIES as readonly string[]).includes(item.category);
  
  // Check if item is private and not owned by active user
  const isHiddenPrivate = item.isPrivate && item.ownerUid !== activeUser?.uid;

  const StatusIcon = item.isFrozen ? Snowflake : isOutOfStock ? XCircle : status === 'expired' ? XCircle : status === 'warning' ? AlertTriangle : Clock;

  const handleToggleFreeze = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFreezeItem(item.id);
  };

  const handleGetTip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTip(true);
    
    if (!storageTip) {
      const result = await getStorageTip(item.name, item.category);
      setStorageTip(result);
    }
  };

  const handleMarkGone = (e: React.MouseEvent) => {
    e.stopPropagation();
    markItemGone(item.id);
    toast.success(`${item.name} marked as gone`, {
      description: item.isFrequentStaple ? 'Added to grocery list' : undefined
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEdit(true);
  };

  const handleSaveEdit = async (
    id: string,
    updates: { quantity?: number; expiryDate?: string; isOpened?: boolean }
  ) => {
    await updateInventoryItem(id, {
      quantity: updates.quantity,
      expiryDate: updates.expiryDate,
    });
  };

  const handleThrowAwayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowThrowAway(true);
  };

  const handleThrowAwayConfirm = (reason: string) => {
    throwAwayItem(item.id, reason);
    toast.success(`${item.name} logged as waste`, {
      description: 'This helps track your monthly food waste',
    });
    setShowThrowAway(false);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "w-full max-w-full p-3 sm:p-4 rounded-2xl bg-card border border-border",
          "text-left transition-all duration-200 overflow-hidden",
          "hover:shadow-elevated hover:border-primary/20",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          owner && "border-l-4",
        )}
        style={owner ? { borderLeftColor: owner.color } : undefined}
      >
        <div className="flex items-start gap-2 sm:gap-3 w-full min-w-0">
          {/* Category Emoji */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
            {categoryEmojis[item.category] || '📦'}
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate max-w-[calc(100%-24px)]">
                  {item.name}
                </h3>
                {item.isPrivate && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </div>
            
            {/* Quantity & Category */}
            <p className="text-sm text-muted-foreground mb-2">
              {item.quantity} {item.unit} · {item.category}
            </p>

            {/* Action Buttons - Larger touch targets for mobile */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Edit button */}
              <button
                onClick={handleEdit}
                className="p-2.5 sm:p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors touch-manipulation"
                title="Edit item"
              >
                <Pencil className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
              </button>
              {/* Mark as Gone button - only show if in stock */}
              {!isOutOfStock && (
                <button
                  onClick={handleMarkGone}
                  className="p-2.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors touch-manipulation"
                  title="Mark as gone (out of stock)"
                >
                  <PackageMinus className="w-5 h-5 sm:w-4 sm:h-4 text-amber-600" />
                </button>
              )}
              {canFreeze && !isOutOfStock && (
                <button
                  onClick={handleToggleFreeze}
                  className={cn(
                    "p-2.5 sm:p-2 rounded-xl transition-colors touch-manipulation",
                    item.isFrozen 
                      ? "bg-sky-500/20 hover:bg-sky-500/30" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                  title={item.isFrozen ? "Unfreeze item" : "Freeze item"}
                >
                  <Snowflake className={cn(
                    "w-5 h-5 sm:w-4 sm:h-4",
                    item.isFrozen ? "text-sky-500" : "text-muted-foreground"
                  )} />
                </button>
              )}
              <button
                onClick={handleGetTip}
                className="p-2.5 sm:p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors touch-manipulation"
                title="Get storage tip"
              >
                <Lightbulb className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
              </button>
              <button
                onClick={handleThrowAwayClick}
                className="p-2.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors touch-manipulation"
                title="Throw away item"
              >
                <Trash className="w-5 h-5 sm:w-4 sm:h-4 text-amber-600" />
              </button>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              {/* Status */}
              <span 
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                  isOutOfStock && "bg-muted text-muted-foreground",
                  !isOutOfStock && item.isFrozen && "bg-sky-500/10 text-sky-600",
                  !isOutOfStock && !item.isFrozen && status === 'fresh' && "status-fresh",
                  !isOutOfStock && !item.isFrozen && status === 'warning' && "status-warning",
                  !isOutOfStock && !item.isFrozen && status === 'expired' && "status-expired",
                )}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {isOutOfStock 
                  ? 'Out of Stock'
                  : item.isFrozen 
                    ? 'Frozen'
                    : status === 'expired' 
                      ? 'Expired' 
                      : status === 'warning' 
                        ? `${daysLeft}d left` 
                        : `${daysLeft} days`
                }
              </span>
              
              {/* Owner Badge */}
              <UserBadge uid={item.ownerUid} showName />
            </div>
          </div>
        </div>
      </button>

      {/* Edit Dialog */}
      <EditInventoryDialog
        item={item}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
        category={item.category}
      />

      {/* Storage Tip Dialog */}
      <Dialog open={showTip} onOpenChange={setShowTip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Storage Tip for {item.name}
            </DialogTitle>
            <DialogDescription>
              Expert advice to extend shelf life
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoading && !storageTip ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : storageTip ? (
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-xl p-4">
                  <p className="text-foreground">{storageTip.tip}</p>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Expected shelf life:</span>
                    <span className="font-medium text-foreground">{storageTip.expectedShelfLife}</span>
                  </div>
                  {storageTip.source && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                      {storageTip.source === 'local' ? '📚 Library' : 
                       storageTip.source === 'database' ? '☁️ Shared' : 
                       storageTip.source === 'ai' ? '✨ AI' : '💡 General'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Couldn't load storage tip. Please try again.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Throw Away Dialog */}
      <ThrowAwayDialog
        open={showThrowAway}
        onOpenChange={setShowThrowAway}
        item={item}
        onConfirm={handleThrowAwayConfirm}
      />
    </>
  );
};

export default InventoryCard;
