import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Edit2, Trash2, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RecognizedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface RecognizedItemConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RecognizedItem[];
  onConfirm: (items: RecognizedItem[]) => void;
  capturedImage: string | null;
}

const categories = ['Dairy', 'Produce', 'Bakery', 'Snacks', 'Pantry', 'Meat', 'Frozen', 'Beverages', 'Other'];
const units = ['pieces', 'lbs', 'oz', 'kg', 'g', 'L', 'ml', 'dozen', 'pack', 'bunch'];

const confidenceColors = {
  high: 'bg-green-500/10 text-green-700 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  low: 'bg-red-500/10 text-red-700 border-red-500/30'
};

const RecognizedItemConfirmation: React.FC<RecognizedItemConfirmationProps> = ({
  open,
  onOpenChange,
  items: initialItems,
  onConfirm,
  capturedImage
}) => {
  const [items, setItems] = useState<RecognizedItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reset items when dialog opens with new items
  React.useEffect(() => {
    setItems(initialItems);
    setEditingId(null);
  }, [initialItems]);

  const toggleSelect = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItem = (id: string, updates: Partial<RecognizedItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addManualItem = () => {
    const newItem: RecognizedItem = {
      id: `manual-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'pieces',
      category: 'Other',
      confidence: 'high',
      selected: true
    };
    setItems(prev => [...prev, newItem]);
    setEditingId(newItem.id);
  };

  const handleConfirm = () => {
    const selectedItems = items.filter(item => item.selected && item.name.trim());
    onConfirm(selectedItems);
    onOpenChange(false);
  };

  const selectedCount = items.filter(i => i.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Confirm Recognized Items
          </DialogTitle>
        </DialogHeader>

        {/* Captured Image Thumbnail */}
        {capturedImage && (
          <div className="w-full h-24 rounded-lg overflow-hidden bg-muted mb-2">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items recognized</p>
              <Button variant="link" onClick={addManualItem} className="mt-2">
                Add item manually
              </Button>
            </div>
          ) : (
            items.map(item => (
              <div 
                key={item.id}
                className={cn(
                  "border rounded-xl p-3 transition-all",
                  item.selected ? "border-primary bg-primary/5" : "border-border bg-card opacity-60"
                )}
              >
                {editingId === item.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Item name"
                      autoFocus
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                      />
                      <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={item.category} onValueChange={(v) => updateItem(item.id, { category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingId(null)} className="flex-1">
                        <Check className="w-4 h-4 mr-1" /> Done
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.name || 'Unnamed item'}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full border",
                          confidenceColors[item.confidence]
                        )}>
                          {item.confidence}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit} • {item.category}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(item.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Manual Button */}
        <Button variant="outline" onClick={addManualItem} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Item Manually
        </Button>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''} to Pantry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecognizedItemConfirmation;
