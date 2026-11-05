import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface MilestoneData {
  itemsAddedCount: number;
  firstScanAt: string | null;
  firstRecipeSavedAt: string | null;
  firstCookingModeAt: string | null;
  firstHouseholdInviteAt: string | null;
  householdMemberCount: number;
}

const CACHE_KEY = 'chef_journey_cache';

function getCachedData(userId: string): MilestoneData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function setCachedData(userId: string, data: MilestoneData) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(data));
  } catch {}
}

export function useChefData() {
  const { user } = useAuthContext();
  const cachedInit = user ? getCachedData(user.id) : null;
  const [data, setData] = useState<MilestoneData>(cachedInit || {
    itemsAddedCount: 0,
    firstScanAt: null,
    firstRecipeSavedAt: null,
    firstCookingModeAt: null,
    firstHouseholdInviteAt: null,
    householdMemberCount: 1,
  });
  const [isLoading, setIsLoading] = useState(!cachedInit);
  const dataRef = useRef(data);
  dataRef.current = data;

  const fetchMilestones = useCallback(async () => {
    if (!user) return;
    try {
      const { data: row } = await (supabase as any)
        .from('chef_journey_milestones')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (row) {
        const newData: MilestoneData = {
          itemsAddedCount: row.items_added_count || 0,
          firstScanAt: row.first_scan_at,
          firstRecipeSavedAt: row.first_recipe_saved_at,
          firstCookingModeAt: row.first_cooking_mode_at,
          firstHouseholdInviteAt: row.first_household_invite_at,
          householdMemberCount: row.household_member_count || 1,
        };
        setData(newData);
        setCachedData(user.id, newData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const recordMilestone = useCallback(async (type: string, extra?: { count?: number }) => {
    if (!user) return;
    const current = dataRef.current;
    const updates: any = { updated_at: new Date().toISOString() };

    switch (type) {
      case 'item_added': updates.items_added_count = (current.itemsAddedCount || 0) + (extra?.count || 1); break;
      case 'scan': if (!current.firstScanAt) updates.first_scan_at = new Date().toISOString(); break;
      case 'recipe_saved': if (!current.firstRecipeSavedAt) updates.first_recipe_saved_at = new Date().toISOString(); break;
      case 'cooking_mode': if (!current.firstCookingModeAt) updates.first_cooking_mode_at = new Date().toISOString(); break;
      case 'household_member': updates.household_member_count = extra?.count || 2; break;
    }

    await (supabase as any).from('chef_journey_milestones').update(updates).eq('user_id', user.id);
    fetchMilestones();
  }, [user, fetchMilestones]);

  // Listen for chef-milestone events from the app
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type) {
        recordMilestone(detail.type, detail);
      }
    };
    window.addEventListener('chef-milestone', handler);
    return () => window.removeEventListener('chef-milestone', handler);
  }, [recordMilestone]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  return { data, isLoading, refetch: fetchMilestones, recordMilestone };
}