import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GroceryListItem } from '@/types/household';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { trackFeatureUse } from '@/lib/operatorTracking';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export const useGroceryLogic = (householdId: string | null, userId: string | null) => {
  const [groceryList, setGroceryList] = useState<GroceryListItem[]>([]);
  const { isOnline, cacheData, getCachedData, queueOperation, STORES } = useOfflineSync(householdId);

  // Fetch Groceries with offline support
  const fetchGroceries = useCallback(async () => {
    if (!householdId) return;

    // If offline, use cached data
    if (!navigator.onLine) {
      const cached = await getCachedData<any>(STORES.GROCERIES);
      if (cached.length > 0) {
        setGroceryList(cached.map((i: any) => ({
          id: i.id, name: i.name, quantity: i.quantity, unit: i.unit,
          isPurchased: i.is_purchased, purchasedAt: i.purchased_at,
          addedByUid: i.added_by_profile_id, addedAt: i.created_at
        })));
      }
      return;
    }

    const { data: list } = await (supabase as any).from('grocery_lists').select('id').eq('household_id', householdId).eq('is_active', true).maybeSingle();
    if (list) {
      const { data: items } = await (supabase as any).from('grocery_list_items').select('*').eq('grocery_list_id', list.id);
      if (items) {
        // Cache for offline use
        cacheData(STORES.GROCERIES, items);
        
        // Filter out items purchased more than 24 hours ago
        const now = Date.now();
        const activeItems = items.filter((i: any) => {
          if (!i.is_purchased || !i.purchased_at) return true;
          const purchasedTime = new Date(i.purchased_at).getTime();
          return (now - purchasedTime) < TWENTY_FOUR_HOURS;
        });
        
        setGroceryList(activeItems.map((i: any) => ({
          id: i.id, name: i.name, quantity: i.quantity, unit: i.unit,
          isPurchased: i.is_purchased, purchasedAt: i.purchased_at,
          addedByUid: i.added_by_profile_id, addedAt: i.created_at
        })));
      }
    }
  }, [householdId, cacheData, getCachedData, STORES]);

  // Real-time Subscription
  useEffect(() => {
    if (!householdId) return;
    fetchGroceries();
    const channel = supabase.channel('grocery-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_list_items' }, fetchGroceries)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchGroceries]);

  // Periodic cleanup of old purchased items (runs every 5 minutes)
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setGroceryList(prev => prev.filter(item => {
        if (!item.isPurchased || !item.purchasedAt) return true;
        const purchasedTime = new Date(item.purchasedAt).getTime();
        return (now - purchasedTime) < TWENTY_FOUR_HOURS;
      }));
    };
    
    const interval = setInterval(cleanup, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Actions
  const addToGroceryList = useCallback(async (item: any) => {
    if (!householdId || !userId) return;
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: GroceryListItem = {
      id: tempId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      isPurchased: false,
      addedByUid: userId,
      addedAt: new Date().toISOString()
    };
    setGroceryList(prev => [...prev, newItem]);

    if (!navigator.onLine) {
      // Queue for later sync
      queueOperation({
        table: 'grocery_list_items',
        operation: 'insert',
        data: { grocery_list_id: 'pending', name: item.name, quantity: item.quantity, unit: item.unit, added_by_profile_id: userId }
      });
      return;
    }

    let { data: list } = await (supabase as any).from('grocery_lists').select('id').eq('household_id', householdId).eq('is_active', true).maybeSingle();
    if (!list) {
      const { data: newList } = await (supabase as any).from('grocery_lists').insert({ household_id: householdId, name: 'Shopping List', created_by_profile_id: userId }).select('id').single();
      list = newList;
    }
    await (supabase as any).from('grocery_list_items').insert({
      grocery_list_id: list.id, name: item.name, quantity: item.quantity, unit: item.unit, added_by_profile_id: userId
    });
    trackFeatureUse('grocery_add', { name: item.name });
    fetchGroceries();
  }, [householdId, userId, fetchGroceries, queueOperation]);

  const toggleGroceryItem = useCallback(async (id: string) => {
    const item = groceryList.find(i => i.id === id);
    if (!item) return;
    
    const newIsPurchased = !item.isPurchased;
    const purchasedAt = newIsPurchased ? new Date().toISOString() : null;
    
    // Optimistic update
    setGroceryList(prev => prev.map(i => i.id === id ? { ...i, isPurchased: newIsPurchased, purchasedAt } : i));

    if (!navigator.onLine) {
      queueOperation({
        table: 'grocery_list_items',
        operation: 'update',
        data: { id, is_purchased: newIsPurchased, purchased_at: purchasedAt }
      });
      return;
    }

    await (supabase as any).from('grocery_list_items').update({ 
      is_purchased: newIsPurchased,
      purchased_at: purchasedAt 
    }).eq('id', id);
  }, [groceryList, queueOperation]);

  const removeFromGroceryList = useCallback(async (id: string) => {
    // Optimistic update
    setGroceryList(prev => prev.filter(i => i.id !== id));

    if (!navigator.onLine) {
      queueOperation({
        table: 'grocery_list_items',
        operation: 'delete',
        data: { id }
      });
      return;
    }

    await (supabase as any).from('grocery_list_items').delete().eq('id', id);
  }, [queueOperation]);

  return { groceryList, addToGroceryList, toggleGroceryItem, removeFromGroceryList, isOnline };
};
