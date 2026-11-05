import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, PinnedItem } from '@/types/household';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { trackFeatureUse } from '@/lib/operatorTracking';

const CATEGORY_VALUES: Record<string, number> = { 'Produce': 1.5, 'Meat': 4, 'Dairy': 2.5, 'Other': 1 };

function parseFreeze(tip: string | null) {
  if (!tip?.includes('__FREEZE__')) return { isFrozen: false };
  try { return JSON.parse(tip.match(/__FREEZE__(.+?)__FREEZE__/)?.[1] || '{}'); } catch { return { isFrozen: false }; }
}

export const useInventoryLogic = (householdId: string | null, userId: string | null, logSavings: (amount: number, itemName: string, category: string) => void) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pinnedItems, setPinnedItems] = useState<Map<string, PinnedItem>>(new Map());
  const [lifetimeUsageCounts, setLifetimeUsageCounts] = useState<Map<string, number>>(new Map());
  const { isOnline, cacheData, getCachedData, queueOperation, STORES } = useOfflineSync(householdId);

  // Fetch lifetime usage counts from database
  const fetchUsageCounts = useCallback(async () => {
    if (!householdId) return;
    
    try {
      // Query inventory_items and count by name (case-insensitive)
      const { data } = await (supabase as any)
        .from('inventory_items')
        .select('name')
        .eq('household_id', householdId);
      
      if (data) {
        const counts = new Map<string, number>();
        data.forEach((item: { name: string }) => {
          const normalizedName = item.name.toLowerCase().trim();
          counts.set(normalizedName, (counts.get(normalizedName) || 0) + 1);
        });
        setLifetimeUsageCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch usage counts:', error);
    }
  }, [householdId]);

  const fetchInventory = useCallback(async () => {
    if (!householdId) return;

    // If offline, use cached data
    if (!navigator.onLine) {
      const cached = await getCachedData<any>(STORES.INVENTORY);
      if (cached.length > 0) {
        setInventory(cached.map((i: any) => {
          const f = parseFreeze(i.storage_tip);
          return {
            id: i.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit,
            expiryDate: i.expiry_date, ownerUid: i.owner_profile_id, isPrivate: i.is_private, addedAt: i.created_at,
            usageCount: 1, isFrozen: f.isFrozen === true, frozenAt: f.frozenAt, daysRemainingWhenFrozen: f.daysRemainingWhenFrozen,
            lastBoughtByUid: i.added_by_profile_id
          };
        }));
      }
      return;
    }

    const { data } = await (supabase as any).from('inventory_items').select('*').eq('household_id', householdId);
    if (data) {
      // Cache for offline use
      cacheData(STORES.INVENTORY, data);
      
      setInventory(data.map((i: any) => {
        const f = parseFreeze(i.storage_tip);
        return {
          id: i.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit,
          expiryDate: i.expiry_date, ownerUid: i.owner_profile_id, isPrivate: i.is_private, addedAt: i.created_at,
          usageCount: 1, isFrozen: f.isFrozen === true, frozenAt: f.frozenAt, daysRemainingWhenFrozen: f.daysRemainingWhenFrozen,
          lastBoughtByUid: i.added_by_profile_id
        };
      }));
    }
  }, [householdId, cacheData, getCachedData, STORES]);

  useEffect(() => {
    if (!householdId) return;
    fetchInventory();
    fetchUsageCounts();
    const channel = supabase.channel('inventory-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        fetchInventory();
        fetchUsageCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchInventory, fetchUsageCounts]);

  const addInventoryItem = useCallback(async (item: any) => {
    if (!householdId || !userId) return false;
    let tip = item.shelfLifeDays ? `Shelf life: ${item.shelfLifeDays}` : '';
    if (item.isFrozen) {
      const meta = { isFrozen: true, frozenAt: new Date().toISOString(), daysRemainingWhenFrozen: 7 };
      tip = `__FREEZE__${JSON.stringify(meta)}__FREEZE__${tip}`;
    }

    if (!navigator.onLine) {
      queueOperation({
        table: 'inventory_items',
        operation: 'insert',
        data: {
          household_id: householdId, name: item.name, category: item.category, quantity: item.quantity, unit: item.unit,
          expiry_date: item.expiryDate, added_by_profile_id: userId, storage_tip: tip
        }
      });
      // Update local counts
      setLifetimeUsageCounts(prev => {
        const newMap = new Map(prev);
        const key = item.name.toLowerCase().trim();
        newMap.set(key, (newMap.get(key) || 0) + 1);
        return newMap;
      });
      return true;
    }

    const { error } = await (supabase as any).from('inventory_items').insert({
      household_id: householdId, name: item.name, category: item.category, quantity: item.quantity, unit: item.unit,
      expiry_date: item.expiryDate, added_by_profile_id: userId, storage_tip: tip
    });
    if (!error) { 
      trackFeatureUse('inventory_add', { name: item.name, category: item.category });
      // Milestone: emit custom event for chef journey
      window.dispatchEvent(new CustomEvent('chef-milestone', { detail: { type: 'item_added' } }));
      fetchInventory(); 
      // Update usage counts immediately
      setLifetimeUsageCounts(prev => {
        const newMap = new Map(prev);
        const key = item.name.toLowerCase().trim();
        newMap.set(key, (newMap.get(key) || 0) + 1);
        return newMap;
      });
      return true; 
    }
    return false;
  }, [householdId, userId, fetchInventory, queueOperation]);

  const removeInventoryItem = useCallback(async (id: string) => {
    if (!navigator.onLine) {
      queueOperation({ table: 'inventory_items', operation: 'delete', data: { id } });
      setInventory(p => p.filter(i => i.id !== id));
      return;
    }
    await (supabase as any).from('inventory_items').delete().eq('id', id);
    trackFeatureUse('inventory_remove', { id });
    setInventory(p => p.filter(i => i.id !== id));
  }, [queueOperation]);

  const updateItemQuantity = useCallback(async (id: string, q: number) => {
    if (!navigator.onLine) {
      queueOperation({ table: 'inventory_items', operation: 'update', data: { id, quantity: q } });
      setInventory(p => p.map(i => i.id === id ? { ...i, quantity: q } : i));
      return;
    }
    await (supabase as any).from('inventory_items').update({ quantity: q }).eq('id', id);
    setInventory(p => p.map(i => i.id === id ? { ...i, quantity: q } : i));
  }, [queueOperation]);

  const updateInventoryItem = useCallback(async (
    id: string,
    updates: { quantity?: number; expiryDate?: string }
  ) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.expiryDate) dbUpdates.expiry_date = updates.expiryDate;

    if (Object.keys(dbUpdates).length === 0) return;

    if (!navigator.onLine) {
      queueOperation({
        table: 'inventory_items',
        operation: 'update',
        data: { id, ...dbUpdates }
      });
      setInventory(prev => prev.map(i =>
        i.id === id ? {
          ...i,
          ...(updates.quantity !== undefined && { quantity: updates.quantity }),
          ...(updates.expiryDate && { expiryDate: updates.expiryDate })
        } : i
      ));
      return;
    }

    await (supabase as any).from('inventory_items').update(dbUpdates).eq('id', id);
    setInventory(prev => prev.map(i =>
      i.id === id ? {
        ...i,
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.expiryDate && { expiryDate: updates.expiryDate })
      } : i
    ));
  }, [queueOperation]);

  const markItemGone = useCallback(async (id: string, wasUsed = true) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    await (supabase as any).from('inventory_items').update({ quantity: 0, status: wasUsed ? 'consumed' : 'wasted' }).eq('id', id);
    
    if (wasUsed && userId) {
      const val = (item as any).estimated_value || CATEGORY_VALUES[item.category] || 1;
      const total = val * (item.quantity || 1);
      logSavings(total, item.name, item.category);
    }
    setInventory(p => p.map(i => i.id === id ? { ...i, quantity: 0 } : i));
  }, [inventory, userId, logSavings]);

  const toggleFreezeItem = useCallback(async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const nowFrozen = !item.isFrozen;
    const tip = nowFrozen ? `__FREEZE__${JSON.stringify({ isFrozen: true })}__FREEZE__` : '';
    await (supabase as any).from('inventory_items').update({ storage_tip: tip }).eq('id', id);
    fetchInventory();
  }, [inventory, fetchInventory]);

  const mergeInventoryItems = useCallback(async (sId: string, tId: string, name: string, qty: number, unit: string) => {
      await (supabase as any).from('inventory_items').update({ name, quantity: qty, unit }).eq('id', tId);
      await (supabase as any).from('inventory_items').delete().eq('id', sId);
      fetchInventory();
      return true;
  }, [fetchInventory]);

  // Helpers - filter out items with quantity <= 0 (marked as "gone")
  const activeInventory = inventory.filter(i => i.quantity > 0);
  const getSortedInventory = () => [...activeInventory].sort((a, b) => {
    if (a.isFrozen && !b.isFrozen) return 1;
    if (!a.isFrozen && b.isFrozen) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
  const getExpiringStaples = (days = 2) => activeInventory.filter(i => new Date(i.expiryDate) <= new Date(Date.now() + days * 86400000));
  const getGoneStaples = () => inventory.filter(i => i.quantity <= 0);
  const getLifetimeUsageCount = (n: string) => lifetimeUsageCounts.get(n.toLowerCase().trim()) || 0;
  const getPinnedItems = () => Array.from(pinnedItems.values());
  const togglePinItem = (item: any) => setPinnedItems(p => { const n = new Map(p); n.has(item.name) ? n.delete(item.name) : n.set(item.name, item); return n; });

  return {
    inventory, addInventoryItem, removeInventoryItem, updateItemQuantity, updateInventoryItem, markItemGone, toggleFreezeItem, mergeInventoryItems,
    getSortedInventory, getExpiringStaples, getGoneStaples, getLifetimeUsageCount, getPinnedItems, togglePinItem, isOnline
  };
};
