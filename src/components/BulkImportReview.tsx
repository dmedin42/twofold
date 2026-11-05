import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Check, Trash2, Package, Snowflake, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ImportedItem } from '@/pages/CheckIn';
import { FREEZABLE_CATEGORIES } from '@/types/household';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Frozen', 'Pantry', 'Beverages', 'Bakery', 'Snacks'] as const;

interface BulkImportReviewProps {
  items: ImportedItem[];
  setItems: React.Dispatch<React.SetStateAction<ImportedItem[]>>;
  onBack: () => void;
  onComplete: () => void;
}

const BulkImportReview: React.FC<BulkImportReviewProps> = ({
  items,
  setItems,
  onBack,
  onComplete,
}) => {
  const { activeUser, addInventoryItem } = useHousehold();
  const [isAdding, setIsAdding] = React.useState(false);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateShelfLife = (id: string, delta: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, shelf_life: Math.max(1, item.shelf_life + delta) }
          : item
      )
    );
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addManualItem = () => {
    const newItem: ImportedItem = {
      id: `manual-${Date.now()}`,
      name: '',
      category: 'Pantry',
      qty: 1,
      unit: 'count',
      shelf_life: 7,
      selected: true,
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItemName = (id: string, name: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, name } : item))
    );
  };

  const updateCategory = (id: string, category: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, category } : item))
    );
  };

  const updateUnit = (id: string, unit: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, unit } : item))
    );
  };

  const toggleFreeze = (id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isFrozen: !item.isFrozen } : item))
    );
  };

  const handleConfirm = async () => {
    if (!activeUser || isAdding) return;
    setIsAdding(true);

    const selectedItems = items.filter(item => item.selected && item.name.trim());
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      setIsAdding(false);
      return;
    }

    const batchId = `batch-${Date.now()}`;
    let successCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + item.shelf_life);

      const daysRemaining = item.shelf_life;

      const success = await addInventoryItem({
        name: item.name,
        category: item.category,
        quantity: item.qty,
        unit: item.unit,
        expiryDate: expiryDate.toISOString().split('T')[0],
        ownerUid: activeUser.uid,
        lastBoughtByUid: activeUser.uid,
        isPrivate: false,
        batchId,
        shelfLifeDays: item.shelf_life,
        isFrozen: item.isFrozen || false,
        frozenAt: item.isFrozen ? new Date().toISOString() : undefined,
        daysRemainingWhenFrozen: item.isFrozen ? daysRemaining : undefined,
      });

      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount > 0) {
      toast.error(`Failed to add ${failCount} item${failCount !== 1 ? 's' : ''}`, {
        description: 'Check console for RLS policy errors. You may need to run the fix SQL.'
      });
    }
    
    if (successCount > 0) {
      toast.success(`Added ${successCount} item${successCount !== 1 ? 's' : ''} to pantry!`);
    }
    
    setIsAdding(false);
    onComplete();
  };

  const selectedCount = items.filter(i => i.selected && i.name.trim()).length;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <span className="text-sm text-muted-foreground flex-1">
          Review & Verify ({selectedCount} selected)
        </span>
      </div>

      {/* Items List */}
      <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No items to review</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={cn(
                "p-4 transition-colors",
                item.selected ? "bg-background" : "bg-muted/30 opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-1"
                />

                {/* Item Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Name - always editable */}
                  <Input
                    value={item.name}
                    onChange={e => updateItemName(item.id, e.target.value)}
                    placeholder="Enter item name..."
                    className="h-8 font-medium"
                  />
                  
                  {/* Category selector */}
                  <Select
                    value={item.category}
                    onValueChange={(value) => updateCategory(item.id, value)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Steppers */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Quantity Stepper with Unit */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground w-8">Qty:</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(item.id, -1)}
                        disabled={item.qty <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="min-w-[3rem] text-center text-sm font-medium">
                        {item.qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      {/* Unit selector */}
                      <Input
                        value={item.unit}
                        onChange={e => updateUnit(item.id, e.target.value)}
                        placeholder="unit"
                        className="h-7 w-20 text-xs px-2"
                      />
                    </div>

                    {/* Shelf Life Stepper */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground w-12">Expires:</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateShelfLife(item.id, -1)}
                        disabled={item.shelf_life <= 1 || item.isFrozen}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className={cn(
                        "w-12 text-center text-sm font-medium",
                        item.isFrozen && "text-sky-500"
                      )}>
                        {item.isFrozen ? '∞' : `${item.shelf_life}d`}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateShelfLife(item.id, 1)}
                        disabled={item.isFrozen}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Freeze Toggle - only for freezable categories */}
                    {(FREEZABLE_CATEGORIES as readonly string[]).includes(item.category) && (
                      <Button
                        variant={item.isFrozen ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFreeze(item.id)}
                        className={cn(
                          "h-7 gap-1 text-xs",
                          item.isFrozen && "bg-sky-500 hover:bg-sky-600"
                        )}
                      >
                        <Snowflake className="w-3 h-3" />
                        {item.isFrozen ? 'Frozen' : 'Freeze'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-3">
        <Button variant="outline" onClick={addManualItem} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Missing Item
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={selectedCount === 0 || isAdding}
          className="w-full gap-2"
        >
          {isAdding ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
          ) : (
            <><Check className="w-4 h-4" /> Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''} to Pantry</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BulkImportReview;
