import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Potluck, PotluckItem, PotluckWithItems, PotluckRsvp, RsvpStatus } from '@/types/potluck';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export function usePotlucks() {
  const { household } = useHousehold();
  const householdId = household?.id || null;
  const [potlucks, setPotlucks] = useState<PotluckWithItems[]>([]);
  const [savedPotlucks, setSavedPotlucks] = useState<PotluckWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPotlucks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!householdId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch household potlucks
      const { data: potlucksData, error: potlucksError } = await (supabase as any)
        .from('potlucks')
        .select('*')
        .eq('household_id', householdId)
        .order('event_date', { ascending: true });

      if (potlucksError) throw potlucksError;

      // Fetch saved potluck IDs for current user
      let savedPotluckIds: string[] = [];
      if (user) {
        const { data: savedData } = await (supabase as any)
          .from('saved_potlucks')
          .select('potluck_id')
          .eq('user_id', user.id);
        savedPotluckIds = (savedData || []).map((s: any) => s.potluck_id);
      }

      // Fetch saved potlucks details (exclude ones from same household)
      let savedPotlucksData: Potluck[] = [];
      if (savedPotluckIds.length > 0) {
        const { data: savedDetails } = await (supabase as any)
          .from('potlucks')
          .select('*')
          .in('id', savedPotluckIds)
          .neq('household_id', householdId)
          .order('event_date', { ascending: true });
        savedPotlucksData = savedDetails || [];
      }

      const allPotluckIds = [
        ...(potlucksData || []).map((p: Potluck) => p.id),
        ...savedPotlucksData.map(p => p.id),
      ];
      
      if (allPotluckIds.length === 0) {
        setPotlucks([]);
        setSavedPotlucks([]);
        setIsLoading(false);
        return;
      }

      // Fetch items and rsvps in parallel
      const [itemsResult, rsvpsResult] = await Promise.all([
        (supabase as any)
          .from('potluck_items')
          .select('*')
          .in('potluck_id', allPotluckIds),
        (supabase as any)
          .from('potluck_rsvps')
          .select('*')
          .in('potluck_id', allPotluckIds),
      ]);

      if (itemsResult.error) throw itemsResult.error;

      const mapPotluck = (p: Potluck): PotluckWithItems => ({
        ...p,
        items: (itemsResult.data || []).filter((i: PotluckItem) => i.potluck_id === p.id),
        rsvps: (rsvpsResult.data || []).filter((r: PotluckRsvp) => r.potluck_id === p.id),
      });

      setPotlucks((potlucksData || []).map(mapPotluck));
      setSavedPotlucks(savedPotlucksData.map(mapPotluck));
    } catch (error) {
      console.error('Error fetching potlucks:', error);
      toast.error('Failed to load potlucks');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchPotlucks();
  }, [fetchPotlucks]);

  // Default starter items to auto-add when creating a potluck
  const STARTER_SUPPLIES = [
    { item_name: 'Plates', category: 'Utensils' },
    { item_name: 'Small Plates', category: 'Utensils' },
    { item_name: 'Utensils', category: 'Utensils' },
    { item_name: 'Cups', category: 'Utensils' },
    { item_name: 'Napkins', category: 'Utensils' },
    { item_name: 'Ice', category: 'Drinks' },
    { item_name: 'Drinks', category: 'Drinks' },
  ];

  const createPotluck = async (data: {
    title: string;
    description?: string;
    event_date: string;
    event_time?: string;
    location?: string;
    is_public?: boolean;
    category_limits?: Record<string, number>;
  }) => {
    if (!householdId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data: newPotluck, error } = await (supabase as any)
        .from('potlucks')
        .insert({
          ...data,
          household_id: householdId,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add starter supplies as needed items
      const starterItems = STARTER_SUPPLIES.map(supply => ({
        potluck_id: newPotluck.id,
        item_name: supply.item_name,
        category: supply.category,
        is_needed: true,
      }));

      const { data: createdItems, error: itemsError } = await (supabase as any)
        .from('potluck_items')
        .insert(starterItems)
        .select();

      if (itemsError) {
        console.error('Error adding starter items:', itemsError);
        // Don't fail the whole operation, just log the error
      }

      setPotlucks(prev => [...prev, { 
        ...newPotluck, 
        items: createdItems || [], 
        rsvps: [] 
      }]);
      toast.success('Potluck created with starter supplies!');
      return newPotluck as Potluck;
    } catch (error) {
      console.error('Error creating potluck:', error);
      toast.error('Failed to create potluck');
      return null;
    }
  };

  const updatePotluck = async (potluckId: string, data: Partial<Potluck>) => {
    try {
      const { data: updated, error } = await (supabase as any)
        .from('potlucks')
        .update(data)
        .eq('id', potluckId)
        .select()
        .single();

      if (error) throw error;

      setPotlucks(prev => prev.map(p => 
        p.id === potluckId ? { ...p, ...updated } : p
      ));
      toast.success('Potluck updated!');
      return updated as Potluck;
    } catch (error) {
      console.error('Error updating potluck:', error);
      toast.error('Failed to update potluck');
      return null;
    }
  };

  const deletePotluck = async (potluckId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('potlucks')
        .delete()
        .eq('id', potluckId);

      if (error) throw error;

      setPotlucks(prev => prev.filter(p => p.id !== potluckId));
      toast.success('Potluck deleted');
    } catch (error) {
      console.error('Error deleting potluck:', error);
      toast.error('Failed to delete potluck');
    }
  };

  const addItem = async (potluckId: string, item: {
    item_name: string;
    category?: string;
    is_needed?: boolean;
    claimed_by_name?: string;
    notes?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data: newItem, error } = await (supabase as any)
        .from('potluck_items')
        .insert({
          ...item,
          potluck_id: potluckId,
          claimed_by_user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPotlucks(prev => prev.map(p => 
        p.id === potluckId 
          ? { ...p, items: [...p.items, newItem as PotluckItem] }
          : p
      ));
      return newItem as PotluckItem;
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
      return null;
    }
  };

  const updateItem = async (itemId: string, data: Partial<PotluckItem>) => {
    try {
      const { data: updated, error } = await (supabase as any)
        .from('potluck_items')
        .update(data)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setPotlucks(prev => prev.map(p => ({
        ...p,
        items: p.items.map(i => i.id === itemId ? { ...i, ...updated } : i),
      })));
      return updated as PotluckItem;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      return null;
    }
  };

  const claimItem = async (itemId: string, claimedByName: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data: updatedItem, error } = await (supabase as any)
        .from('potluck_items')
        .update({
          claimed_by_name: claimedByName,
          claimed_by_user_id: user?.id || null,
          is_needed: false,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setPotlucks(prev => prev.map(p => ({
        ...p,
        items: p.items.map(i => i.id === itemId ? updatedItem as PotluckItem : i),
      })));
      toast.success('Item claimed!');
      return updatedItem as PotluckItem;
    } catch (error) {
      console.error('Error claiming item:', error);
      toast.error('Failed to claim item');
      return null;
    }
  };

  const unclaimItem = async (itemId: string) => {
    try {
      const { data: updatedItem, error } = await (supabase as any)
        .from('potluck_items')
        .update({
          claimed_by_name: null,
          claimed_by_user_id: null,
          is_needed: true,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setPotlucks(prev => prev.map(p => ({
        ...p,
        items: p.items.map(i => i.id === itemId ? updatedItem as PotluckItem : i),
      })));
      toast.success('Item unclaimed');
      return updatedItem as PotluckItem;
    } catch (error) {
      console.error('Error unclaiming item:', error);
      toast.error('Failed to unclaim item');
      return null;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('potluck_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setPotlucks(prev => prev.map(p => ({
        ...p,
        items: p.items.filter(i => i.id !== itemId),
      })));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const savePotluck = async (potluckId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to save potlucks');
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('saved_potlucks')
        .insert({ user_id: user.id, potluck_id: potluckId })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.info('Potluck already saved');
          return null;
        }
        throw error;
      }

      toast.success('Potluck saved to your dashboard!');
      fetchPotlucks();
      return data;
    } catch (error) {
      console.error('Error saving potluck:', error);
      toast.error('Failed to save potluck');
      return null;
    }
  };

  const unsavePotluck = async (potluckId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('saved_potlucks')
        .delete()
        .eq('user_id', user.id)
        .eq('potluck_id', potluckId);

      if (error) throw error;

      setSavedPotlucks(prev => prev.filter(p => p.id !== potluckId));
      toast.success('Potluck removed from dashboard');
    } catch (error) {
      console.error('Error unsaving potluck:', error);
      toast.error('Failed to remove potluck');
    }
  };

  const isOwnPotluck = (potluckId: string) => {
    return potlucks.some(p => p.id === potluckId);
  };

  const isSavedPotluck = (potluckId: string) => {
    return savedPotlucks.some(p => p.id === potluckId);
  };

  return {
    potlucks,
    savedPotlucks,
    isLoading,
    refetch: fetchPotlucks,
    createPotluck,
    updatePotluck,
    deletePotluck,
    addItem,
    updateItem,
    claimItem,
    unclaimItem,
    deleteItem,
    savePotluck,
    unsavePotluck,
    isOwnPotluck,
    isSavedPotluck,
  };
}

// Hook for public potluck access (no auth required)
export function usePublicPotluck(shareCode: string | null) {
  const [potluck, setPotluck] = useState<PotluckWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const fetchPotluck = useCallback(async () => {
    if (!shareCode) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: potluckData, error: potluckError } = await (supabase as any)
        .from('potlucks')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_public', true)
        .single();

      if (potluckError) {
        if (potluckError.code === 'PGRST116') {
          setError('Potluck not found or is private');
        } else {
          throw potluckError;
        }
        return;
      }

      if (!potluckData) {
        setError('Potluck not found');
        return;
      }

      // Fetch items, rsvps, and check if saved in parallel
      const { data: { user } } = await supabase.auth.getUser();
      
      const [itemsResult, rsvpsResult, savedResult] = await Promise.all([
        (supabase as any)
          .from('potluck_items')
          .select('*')
          .eq('potluck_id', potluckData.id),
        (supabase as any)
          .from('potluck_rsvps')
          .select('*')
          .eq('potluck_id', potluckData.id),
        user ? (supabase as any)
          .from('saved_potlucks')
          .select('id')
          .eq('user_id', user.id)
          .eq('potluck_id', potluckData.id)
          .maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (itemsResult.error) throw itemsResult.error;

      setPotluck({
        ...potluckData as Potluck,
        items: (itemsResult.data || []) as PotluckItem[],
        rsvps: (rsvpsResult.data || []) as PotluckRsvp[],
      });
      setIsSaved(!!savedResult.data);
    } catch (err) {
      console.error('Error fetching public potluck:', err);
      setError('Failed to load potluck');
    } finally {
      setIsLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchPotluck();
  }, [fetchPotluck]);

  // Real-time subscription for potluck items and RSVPs
  useEffect(() => {
    if (!potluck?.id) return;

    console.log('🔴 Setting up real-time subscription for potluck:', potluck.id);

    // Subscribe to potluck_items changes
    const itemsChannel = supabase
      .channel(`potluck-items-${potluck.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'potluck_items',
          filter: `potluck_id=eq.${potluck.id}`,
        },
        (payload: any) => {
          console.log('📦 Potluck items change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setPotluck(prev => prev ? {
              ...prev,
              items: [...prev.items, payload.new as PotluckItem],
            } : null);
          } else if (payload.eventType === 'UPDATE') {
            setPotluck(prev => prev ? {
              ...prev,
              items: prev.items.map(i => 
                i.id === payload.new.id ? payload.new as PotluckItem : i
              ),
            } : null);
          } else if (payload.eventType === 'DELETE') {
            setPotluck(prev => prev ? {
              ...prev,
              items: prev.items.filter(i => i.id !== payload.old.id),
            } : null);
          }
        }
      )
      .subscribe();

    // Subscribe to potluck_rsvps changes
    const rsvpsChannel = supabase
      .channel(`potluck-rsvps-${potluck.id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'potluck_rsvps',
          filter: `potluck_id=eq.${potluck.id}`,
        },
        (payload: any) => {
          console.log('👥 Potluck RSVPs change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setPotluck(prev => prev ? {
              ...prev,
              rsvps: [...(prev.rsvps || []), payload.new as PotluckRsvp],
            } : null);
          } else if (payload.eventType === 'UPDATE') {
            setPotluck(prev => prev ? {
              ...prev,
              rsvps: (prev.rsvps || []).map(r => 
                r.id === payload.new.id ? payload.new as PotluckRsvp : r
              ),
            } : null);
          } else if (payload.eventType === 'DELETE') {
            setPotluck(prev => prev ? {
              ...prev,
              rsvps: (prev.rsvps || []).filter(r => r.id !== payload.old.id),
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔴 Cleaning up real-time subscriptions');
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(rsvpsChannel);
    };
  }, [potluck?.id]);

  const savePotluck = async () => {
    if (!potluck) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to save this potluck');
      return null;
    }

    try {
      const { error } = await (supabase as any)
        .from('saved_potlucks')
        .insert({ user_id: user.id, potluck_id: potluck.id });

      if (error) {
        if (error.code === '23505') {
          toast.info('Already saved to your dashboard');
          setIsSaved(true);
          return null;
        }
        throw error;
      }

      setIsSaved(true);
      toast.success('Potluck saved to your dashboard!');
      return true;
    } catch (err) {
      console.error('Error saving potluck:', err);
      toast.error('Failed to save potluck');
      return null;
    }
  };

  const unsavePotluck = async () => {
    if (!potluck) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('saved_potlucks')
        .delete()
        .eq('user_id', user.id)
        .eq('potluck_id', potluck.id);

      if (error) throw error;

      setIsSaved(false);
      toast.success('Removed from your dashboard');
    } catch (err) {
      console.error('Error unsaving potluck:', err);
      toast.error('Failed to remove potluck');
    }
  };

  const claimItem = async (itemId: string, guestName: string) => {
    try {
      const { data: updatedItem, error } = await (supabase as any)
        .from('potluck_items')
        .update({
          claimed_by_name: guestName,
          is_needed: false,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state - real-time subscription will handle it
      toast.success('Item claimed!');
      return updatedItem as PotluckItem;
    } catch (err) {
      console.error('Error claiming item:', err);
      toast.error('Failed to claim item');
      return null;
    }
  };

  const unclaimItem = async (itemId: string) => {
    try {
      const { data: updatedItem, error } = await (supabase as any)
        .from('potluck_items')
        .update({
          claimed_by_name: null,
          is_needed: true,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state - real-time subscription will handle it
      toast.success('Item removed');
      return updatedItem as PotluckItem;
    } catch (err) {
      console.error('Error unclaiming item:', err);
      toast.error('Failed to remove item');
      return null;
    }
  };

  const updateItem = async (itemId: string, data: { item_name?: string; category?: string; notes?: string }) => {
    try {
      const { data: updatedItem, error } = await (supabase as any)
        .from('potluck_items')
        .update(data)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      // Don't update local state - real-time subscription will handle it
      toast.success('Item updated!');
      return updatedItem as PotluckItem;
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error('Failed to update item');
      return null;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('potluck_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Don't update local state - real-time subscription will handle it
      toast.success('Item removed');
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Failed to remove item');
    }
  };

  const addGuestItem = async (potluckId: string, item: {
    item_name: string;
    category?: string;
    claimed_by_name: string;
    notes?: string;
  }) => {
    try {
      const { data: newItem, error } = await (supabase as any)
        .from('potluck_items')
        .insert({
          ...item,
          potluck_id: potluckId,
          is_needed: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Don't update local state - real-time subscription will handle it
      toast.success('Dish added!');
      return newItem as PotluckItem;
    } catch (err) {
      console.error('Error adding guest item:', err);
      toast.error('Failed to add dish');
      return null;
    }
  };

  // RSVP functions
  const rsvp = async (potluckId: string, guestName: string, status: RsvpStatus) => {
    try {
      // Try to upsert - if exists, update; else insert
      const { data: existing } = await (supabase as any)
        .from('potluck_rsvps')
        .select('id')
        .eq('potluck_id', potluckId)
        .eq('guest_name', guestName)
        .single();

      let result;
      if (existing) {
        result = await (supabase as any)
          .from('potluck_rsvps')
          .update({ status })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await (supabase as any)
          .from('potluck_rsvps')
          .insert({ potluck_id: potluckId, guest_name: guestName, status })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Don't update local state - real-time subscription will handle it
      const statusText = status === 'going' ? "You're going!" : status === 'maybe' ? 'Marked as maybe' : 'RSVP updated';
      toast.success(statusText);
      return result.data as PotluckRsvp;
    } catch (err) {
      console.error('Error updating RSVP:', err);
      toast.error('Failed to update RSVP');
      return null;
    }
  };

  return {
    potluck,
    isLoading,
    error,
    isSaved,
    refetch: fetchPotluck,
    claimItem,
    unclaimItem,
    updateItem,
    deleteItem,
    addGuestItem,
    rsvp,
    savePotluck,
    unsavePotluck,
  };
}

// Helper to check for similar items (duplicate prevention)
export function findSimilarItems(items: PotluckItem[], newItemName: string): PotluckItem[] {
  const normalized = newItemName.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  
  return items.filter(item => {
    const itemName = item.item_name.toLowerCase();
    // Exact match
    if (itemName === normalized) return true;
    // Contains match
    if (itemName.includes(normalized) || normalized.includes(itemName)) return true;
    // Word overlap (at least one significant word matches)
    return words.some(word => itemName.includes(word));
  });
}

// Helper to check category limits
export function getCategoryStatus(
  items: PotluckItem[], 
  category: string, 
  limits?: Record<string, number> | null
): { count: number; limit: number | null; isFull: boolean } {
  const categoryItems = items.filter(i => i.category === category && !i.is_needed);
  const count = categoryItems.length;
  const limit = limits?.[category] ?? null;
  const isFull = limit !== null && count >= limit;
  
  return { count, limit, isFull };
}
