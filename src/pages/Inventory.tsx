import React, { useState, useMemo, useCallback } from "react";
import { useHousehold } from '@/contexts/HouseholdContext';
import Navigation from '@/components/Navigation';
import DraggableInventoryCard from '@/components/DraggableInventoryCard';
import AddInventoryForm from '@/components/AddInventoryForm';
import MergeConfirmDialog from '@/components/MergeConfirmDialog';
import { Search, Filter, Package, PackageX, Merge } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/types/household';
import { standardizeItemName, normalizeUnit, convertUnits, areUnitsCompatible } from '@/lib/atomicUnits';
import { toast } from 'sonner';

const categories = ['All', 'Dairy', 'Produce', 'Bakery', 'Snacks', 'Pantry', 'Meat', 'Frozen', 'Beverages'];

const Inventory: React.FC = () => {
  const { getSortedInventory, activeUser, mergeInventoryItems } = useHousehold();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [sourceItem, setSourceItem] = useState<InventoryItem | null>(null);
  const [targetItem, setTargetItem] = useState<InventoryItem | null>(null);

  // Get FIFO-sorted inventory
  const sortedInventory = getSortedInventory();

  const filteredInventory = sortedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesOwner = !showOnlyMine || item.ownerUid === activeUser?.uid;
    
    // Hide private items not owned by active user
    if (item.isPrivate && item.ownerUid !== activeUser?.uid && item.ownerUid !== 'global') {
      return false;
    }
    
    return matchesSearch && matchesCategory && matchesOwner;
  });

  // Separate in-stock and out-of-stock items
  const inStockItems = filteredInventory.filter(item => item.quantity > 0);
  const rawOutOfStockItems = filteredInventory.filter(item => item.quantity <= 0);

  // Consolidate out-of-stock items by name (show each item only once)
  const outOfStockItems = useMemo(() => {
    const seen = new Map<string, typeof rawOutOfStockItems[0]>();
    rawOutOfStockItems.forEach(item => {
      const key = item.name.toLowerCase().trim();
      // Keep the first occurrence (or could use most recent by comparing addedAt)
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    });
    return Array.from(seen.values());
  }, [rawOutOfStockItems]);

  // Handle drag start
  const handleDragStart = useCallback((item: InventoryItem) => {
    setDraggedItem(item);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Handle drop - determine if auto-merge or show dialog
  const handleDrop = useCallback((targetItem: InventoryItem) => {
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const sourceName = standardizeItemName(draggedItem.name);
    const targetName = standardizeItemName(targetItem.name);
    const namesMatch = sourceName.toLowerCase() === targetName.toLowerCase();
    
    const sourceUnit = normalizeUnit(draggedItem.unit);
    const targetUnit = normalizeUnit(targetItem.unit);
    const unitsMatch = sourceUnit === targetUnit;

    if (namesMatch && unitsMatch) {
      // Auto-merge - same name and units
      const newQuantity = draggedItem.quantity + targetItem.quantity;
      mergeInventoryItems(draggedItem.id, targetItem.id, targetItem.name, newQuantity, targetItem.unit)
        .then(success => {
          if (success) {
            toast.success('Items merged', {
              description: `Combined into ${newQuantity} ${targetItem.unit} of ${targetItem.name}`,
              icon: <Merge className="w-4 h-4" />,
            });
          } else {
            toast.error('Failed to merge items');
          }
        });
    } else if (namesMatch && areUnitsCompatible(draggedItem.unit, targetItem.unit)) {
      // Same name but different compatible units - convert and auto-merge
      const converted = convertUnits(draggedItem.quantity, draggedItem.unit, targetItem.unit);
      if (converted !== null) {
        const newQuantity = Math.round((targetItem.quantity + converted) * 100) / 100;
        mergeInventoryItems(draggedItem.id, targetItem.id, targetItem.name, newQuantity, targetItem.unit)
          .then(success => {
            if (success) {
              toast.success('Items merged', {
                description: `Converted and combined into ${newQuantity} ${targetItem.unit} of ${targetItem.name}`,
                icon: <Merge className="w-4 h-4" />,
              });
            } else {
              toast.error('Failed to merge items');
            }
          });
      } else {
        // Conversion failed - show dialog
        setSourceItem(draggedItem);
        setTargetItem(targetItem);
        setMergeDialogOpen(true);
      }
    } else {
      // Different names or incompatible units - show confirmation dialog
      setSourceItem(draggedItem);
      setTargetItem(targetItem);
      setMergeDialogOpen(true);
    }

    setDraggedItem(null);
  }, [draggedItem, mergeInventoryItems]);

  // Handle merge confirmation
  const handleMergeConfirm = useCallback((standardizedName: string, totalQuantity: number, finalUnit: string) => {
    if (!sourceItem || !targetItem) return;

    mergeInventoryItems(sourceItem.id, targetItem.id, standardizedName, totalQuantity, finalUnit)
      .then(success => {
        if (success) {
          toast.success('Items merged', {
            description: `Combined into ${totalQuantity} ${finalUnit} of ${standardizedName}`,
            icon: <Merge className="w-4 h-4" />,
          });
        } else {
          toast.error('Failed to merge items');
        }
      });

    setMergeDialogOpen(false);
    setSourceItem(null);
    setTargetItem(null);
  }, [sourceItem, targetItem, mergeInventoryItems]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 overflow-x-hidden w-full max-w-full">
      <Navigation />
      
      <main className="px-3 sm:px-4 py-6 max-w-4xl mx-auto overflow-hidden w-full box-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground mb-1">
              Pantry+
            </h1>
            <p className="text-sm text-muted-foreground">
              {inStockItems.length} items in stock
              {outOfStockItems.length > 0 && ` · ${outOfStockItems.length} out of stock`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Drag hint */}
        {inStockItems.length > 1 && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground flex items-center gap-2">
            <Merge className="w-4 h-4" />
            <span>Drag items onto each other to merge duplicates</span>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-card border-border"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2 mb-6">
          {activeUser && (
            <button
              onClick={() => setShowOnlyMine(!showOnlyMine)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                showOnlyMine
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Filter className="w-4 h-4" />
              My Items Only
            </button>
          )}
          {outOfStockItems.length > 0 && (
            <button
              onClick={() => setShowOutOfStock(!showOutOfStock)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                showOutOfStock
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <PackageX className="w-4 h-4" />
              Out of Stock ({outOfStockItems.length})
            </button>
          )}
        </div>

        {/* Add Item Form */}
        <div className="mb-6">
          <AddInventoryForm />
        </div>

        {/* In Stock Grid */}
        {inStockItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              In Stock
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {inStockItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-float-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DraggableInventoryCard
                    item={item}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    isDragging={draggedItem?.id === item.id}
                    isDropTarget={draggedItem !== null && draggedItem.id !== item.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Out of Stock Grid */}
        {showOutOfStock && outOfStockItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-amber-600 mb-3 flex items-center gap-2">
              <PackageX className="w-4 h-4" />
              Out of Stock
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 opacity-75">
              {outOfStockItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-float-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DraggableInventoryCard
                    item={item}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    isDragging={draggedItem?.id === item.id}
                    isDropTarget={draggedItem !== null && draggedItem.id !== item.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {inStockItems.length === 0 && !showOutOfStock && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </main>

      {/* Merge Confirmation Dialog */}
      <MergeConfirmDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        sourceItem={sourceItem}
        targetItem={targetItem}
        onConfirm={handleMergeConfirm}
      />
    </div>
  );
};

export default Inventory;
