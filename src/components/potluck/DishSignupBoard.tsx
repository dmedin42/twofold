import React, { useState } from 'react';
import { PotluckItem, PotluckCategory, POTLUCK_CATEGORIES } from '@/types/potluck';
import { findSimilarItems, getCategoryStatus } from '@/hooks/usePotlucks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Check, Loader2, Plus, Pencil, Trash2, X, Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DishSignupBoardProps {
  items: PotluckItem[];
  categoryLimits?: Record<string, number> | null;
  guestName: string;
  isHost: boolean;
  isPastEvent: boolean;
  onClaim: (itemId: string) => Promise<any>;
  onUnclaim: (itemId: string) => Promise<any>;
  onUpdateItem: (itemId: string, data: { item_name?: string; category?: string }) => Promise<any>;
  onDeleteItem: (itemId: string) => Promise<any>;
  onAddDish: (data: { item_name: string; category: string; claimed_by_name: string }) => Promise<any>;
  onAddNeededItem: (data: { item_name: string; category: string; notes?: string }) => Promise<any>;
}

const DishSignupBoard: React.FC<DishSignupBoardProps> = ({
  items,
  categoryLimits,
  guestName,
  isHost,
  isPastEvent,
  onClaim,
  onUnclaim,
  onUpdateItem,
  onDeleteItem,
  onAddDish,
  onAddNeededItem,
}) => {
  const [showAddDish, setShowAddDish] = useState(false);
  const [showAddNeeded, setShowAddNeeded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ item_name: '', category: '' });
  const [newDish, setNewDish] = useState({ name: '', category: 'Other' as PotluckCategory });
  const [newNeededItem, setNewNeededItem] = useState({ name: '', category: 'Other' as PotluckCategory, notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const neededItems = items.filter(i => i.is_needed);
  const claimedItems = items.filter(i => !i.is_needed);

  // Group by category
  const groupedNeeded = POTLUCK_CATEGORIES.reduce((acc, cat) => {
    const catItems = neededItems.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, PotluckItem[]>);

  const groupedClaimed = POTLUCK_CATEGORIES.reduce((acc, cat) => {
    const catItems = claimedItems.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, PotluckItem[]>);

  // Check if guest can edit/delete an item
  const canManageItem = (item: PotluckItem) => {
    if (isHost) return true;
    return item.claimed_by_name?.toLowerCase() === guestName.toLowerCase();
  };

  // Check for duplicates when typing
  const checkDuplicates = (name: string) => {
    if (!name.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const similar = findSimilarItems(items, name);
    if (similar.length > 0) {
      setDuplicateWarning(`Similar item exists: "${similar[0].item_name}" by ${similar[0].claimed_by_name || 'unclaimed'}`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleAddDish = async () => {
    if (!newDish.name.trim()) return;
    
    const { isFull } = getCategoryStatus(items, newDish.category, categoryLimits);
    if (isFull) {
      return; // Category is full
    }

    setIsSubmitting(true);
    await onAddDish({
      item_name: newDish.name.trim(),
      category: newDish.category,
      claimed_by_name: guestName,
    });
    setNewDish({ name: '', category: 'Other' });
    setShowAddDish(false);
    setDuplicateWarning(null);
    setIsSubmitting(false);
  };

  const handleAddNeeded = async () => {
    if (!newNeededItem.name.trim()) return;
    setIsSubmitting(true);
    await onAddNeededItem({
      item_name: newNeededItem.name.trim(),
      category: newNeededItem.category,
      notes: newNeededItem.notes.trim() || undefined,
    });
    setNewNeededItem({ name: '', category: 'Other', notes: '' });
    setShowAddNeeded(false);
    setIsSubmitting(false);
  };

  const handleClaim = async (itemId: string) => {
    setIsSubmitting(true);
    await onClaim(itemId);
    setIsSubmitting(false);
  };

  const handleEdit = (item: PotluckItem) => {
    setEditingId(item.id);
    setEditData({ item_name: item.item_name, category: item.category });
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editData.item_name.trim()) return;
    setIsSubmitting(true);
    await onUpdateItem(itemId, editData);
    setEditingId(null);
    setIsSubmitting(false);
  };

  const renderCategoryHeader = (category: string) => {
    const status = getCategoryStatus(items, category, categoryLimits);
    return (
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {category}
        </span>
        {status.limit !== null && status.limit > 0 && (
          <Badge 
            variant={status.isFull ? "destructive" : "secondary"} 
            className="text-xs"
          >
            {status.count}/{status.limit}
            {status.isFull && " FULL"}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Host: Add Needed Items */}
      {isHost && !isPastEvent && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Add Items Needed</h2>
          
          {showAddNeeded ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="e.g., Plates, Cups, Ice..."
                  value={newNeededItem.name}
                  onChange={e => setNewNeededItem(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl"
                />
                <Select
                  value={newNeededItem.category}
                  onValueChange={value => setNewNeededItem(prev => ({ ...prev, category: value as PotluckCategory }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POTLUCK_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Notes (optional)"
                  value={newNeededItem.notes}
                  onChange={e => setNewNeededItem(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowAddNeeded(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 rounded-xl" onClick={handleAddNeeded} disabled={isSubmitting || !newNeededItem.name.trim()}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl h-11 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
              onClick={() => setShowAddNeeded(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item for Guests
            </Button>
          )}
        </div>
      )}

      {/* Needed Items */}
      {Object.keys(groupedNeeded).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Still Needed ({neededItems.length})
          </h2>
          
          {Object.entries(groupedNeeded).map(([category, catItems]) => (
            <div key={category} className="space-y-2">
              {renderCategoryHeader(category)}
              {catItems.map(item => (
                <Card key={item.id} className="border-border/50 bg-card/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{item.item_name}</span>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isHost && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {!isPastEvent && guestName.trim() && (
                          <Button
                            size="sm"
                            className="rounded-xl h-8"
                            onClick={() => handleClaim(item.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I'll bring this"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {neededItems.length === 0 && !isHost && (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="py-8 text-center">
            <Check className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              All items have been claimed! Add a dish below if you'd like.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Claimed Items / Sign-up Board */}
      {Object.keys(groupedClaimed).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Who's Bringing What
          </h2>
          
          {Object.entries(groupedClaimed).map(([category, catItems]) => (
            <div key={category} className="space-y-2">
              {renderCategoryHeader(category)}
              {catItems.map(item => (
                <Card 
                  key={item.id} 
                  className={cn(
                    "border-primary/20 bg-primary/5",
                    canManageItem(item) && "ring-1 ring-primary/30"
                  )}
                >
                  <CardContent className="p-3">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editData.item_name}
                          onChange={e => setEditData(prev => ({ ...prev, item_name: e.target.value }))}
                          className="rounded-lg h-8"
                        />
                        <Select
                          value={editData.category}
                          onValueChange={value => setEditData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="rounded-lg h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POTLUCK_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                            <X className="w-3 h-3" />
                          </Button>
                          <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={isSubmitting} className="h-7">
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{item.item_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageItem(item) && !isPastEvent && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => isHost ? onDeleteItem(item.id) : onUnclaim(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Users className="w-3 h-3 text-primary" />
                          <span className="text-sm text-primary font-medium">
                            {item.claimed_by_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Your Dish (for guests) */}
      {!isPastEvent && guestName.trim() && (
        <div className="pt-2">
          {showAddDish ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium text-foreground">Add a Dish You're Bringing</h3>
                <Input
                  placeholder="What are you bringing?"
                  value={newDish.name}
                  onChange={e => {
                    setNewDish(prev => ({ ...prev, name: e.target.value }));
                    checkDuplicates(e.target.value);
                  }}
                  className="rounded-xl"
                />
                
                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                <Select
                  value={newDish.category}
                  onValueChange={value => setNewDish(prev => ({ ...prev, category: value as PotluckCategory }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POTLUCK_CATEGORIES.map(cat => {
                      const status = getCategoryStatus(items, cat, categoryLimits);
                      return (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          disabled={status.isFull}
                        >
                          <span className={cn(status.isFull && "text-muted-foreground")}>
                            {cat}
                            {status.isFull && " (Full)"}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Category Full Warning */}
                {getCategoryStatus(items, newDish.category, categoryLimits).isFull && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <X className="w-4 h-4 shrink-0" />
                    <span>This category is full. Please choose another.</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {
                    setShowAddDish(false);
                    setDuplicateWarning(null);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={handleAddDish}
                    disabled={
                      isSubmitting || 
                      !newDish.name.trim() || 
                      getCategoryStatus(items, newDish.category, categoryLimits).isFull
                    }
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Dish'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 border-dashed"
              onClick={() => setShowAddDish(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add a Dish You're Bringing
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default DishSignupBoard;
