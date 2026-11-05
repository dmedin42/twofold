import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WeeklySavingsData {
  totalSavings: number;
  itemsRescued: number;
  weeklySavings: number;
  weeklyItemsRescued: number;
  weekStart: string;
  weekEnd: string;
}

interface MonthlyWasteData {
  totalWasted: number;
  itemsWasted: number;
  monthStart: string;
  monthEnd: string;
  wasteByCategory: Record<string, { count: number; value: number }>;
  topWastedItems: { name: string; count: number; value: number }[];
}

// Get Sunday of the current week
function getSundayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get Saturday of the current week
function getSaturdayOfWeek(date: Date = new Date()): Date {
  const sunday = getSundayOfWeek(date);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

// Get first day of current month
function getMonthStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get last day of current month
function getMonthEnd(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Map category to valid waste reason for DB
function mapCategoryToReason(category: string): 'expired' | 'spoiled' | 'leftover' | 'other' {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('expire')) return 'expired';
  if (lowerCat.includes('spoil')) return 'spoiled';
  if (lowerCat.includes('leftover')) return 'leftover';
  return 'other';
}

export const useWeeklySavings = (householdId: string | null, userId: string | null) => {
  const [savingsData, setSavingsData] = useState<WeeklySavingsData>({
    totalSavings: 0,
    itemsRescued: 0,
    weeklySavings: 0,
    weeklyItemsRescued: 0,
    weekStart: getSundayOfWeek().toISOString(),
    weekEnd: getSaturdayOfWeek().toISOString(),
  });

  const [wasteData, setWasteData] = useState<MonthlyWasteData>({
    totalWasted: 0,
    itemsWasted: 0,
    monthStart: getMonthStart().toISOString(),
    monthEnd: getMonthEnd().toISOString(),
    wasteByCategory: {},
    topWastedItems: [],
  });

  // Fetch current savings from database
  const fetchSavingsData = useCallback(async () => {
    if (!householdId || !userId) return;

    const weekStart = getSundayOfWeek();
    const weekEnd = getSaturdayOfWeek();

    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('savings_total, items_rescued_total')
        .eq('id', userId)
        .maybeSingle();

      const { data: weeklyLogs } = await (supabase as any)
        .from('savings_logs')
        .select('amount, items_count')
        .eq('household_id', householdId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      const weeklySavings = weeklyLogs?.reduce((sum: number, log: any) => sum + (log.amount || 0), 0) || 0;
      const weeklyItemsRescued = weeklyLogs?.reduce((sum: number, log: any) => sum + (log.items_count || 0), 0) || 0;

      setSavingsData({
        totalSavings: profile?.savings_total || 0,
        itemsRescued: profile?.items_rescued_total || 0,
        weeklySavings,
        weeklyItemsRescued,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      });
    } catch (error) {
      console.error('Error fetching savings data:', error);
    }
  }, [householdId, userId]);

  // Fetch monthly waste data from Supabase waste_logs table
  const fetchWasteData = useCallback(async () => {
    if (!householdId) return;

    const monthStart = getMonthStart();
    const monthEnd = getMonthEnd();

    try {
      const { data: wasteLogs, error } = await (supabase as any)
        .from('waste_logs')
        .select('*')
        .eq('household_id', householdId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching waste logs:', error);
        return;
      }

      if (!wasteLogs || wasteLogs.length === 0) {
        setWasteData({
          totalWasted: 0,
          itemsWasted: 0,
          monthStart: monthStart.toISOString(),
          monthEnd: monthEnd.toISOString(),
          wasteByCategory: {},
          topWastedItems: [],
        });
        return;
      }

      // Calculate totals - quantity_wasted stores dollar value
      const totalWasted = wasteLogs.reduce((sum: number, log: any) => sum + (log.quantity_wasted || 0), 0);
      const itemsWasted = wasteLogs.length;

      // Group by reason (used as category stand-in)
      const wasteByCategory: Record<string, { count: number; value: number }> = {};
      const itemCounts: Record<string, { count: number; value: number }> = {};

      wasteLogs.forEach((log: any) => {
        // Map reason back to display category
        const cat = log.reason === 'expired' ? 'Expired' 
                  : log.reason === 'spoiled' ? 'Spoiled'
                  : log.reason === 'leftover' ? 'Leftover'
                  : 'Other';
        
        if (!wasteByCategory[cat]) {
          wasteByCategory[cat] = { count: 0, value: 0 };
        }
        wasteByCategory[cat].count += 1;
        wasteByCategory[cat].value += log.quantity_wasted || 0;

        const itemName = log.name || 'Unknown';
        if (!itemCounts[itemName]) {
          itemCounts[itemName] = { count: 0, value: 0 };
        }
        itemCounts[itemName].count += 1;
        itemCounts[itemName].value += log.quantity_wasted || 0;
      });

      // Get top wasted items
      const topWastedItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setWasteData({
        totalWasted,
        itemsWasted,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        wasteByCategory,
        topWastedItems,
      });
    } catch (error) {
      console.error('Error fetching waste data:', error);
    }
  }, [householdId]);

  // Log a new savings event
  const logSavings = useCallback(async (amount: number, itemName: string, category: string) => {
    if (!householdId || !userId) return;

    try {
      await (supabase as any)
        .from('savings_logs')
        .insert({
          household_id: householdId,
          profile_id: userId,
          amount,
          items_count: 1,
          item_name: itemName,
          category,
        });

      await (supabase as any).rpc('increment_savings', { 
        profile_id: userId, 
        amount,
        items_count: 1
      });

      setSavingsData(prev => ({
        ...prev,
        totalSavings: prev.totalSavings + amount,
        itemsRescued: prev.itemsRescued + 1,
        weeklySavings: prev.weeklySavings + amount,
        weeklyItemsRescued: prev.weeklyItemsRescued + 1,
      }));
    } catch (error) {
      console.error('Error logging savings:', error);
    }
  }, [householdId, userId]);

  // Log a waste event - stores in Supabase waste_logs table
  const logWaste = useCallback(async (dollarValue: number, itemName: string, category: string, reason?: string) => {
    if (!householdId || !userId) return;

    try {
      // Insert into Supabase waste_logs table
      const { error } = await (supabase as any)
        .from('waste_logs')
        .insert({
          household_id: householdId,
          name: itemName,
          quantity_wasted: dollarValue, // Storing dollar value
          unit: 'dollars',
          reason: reason ? mapCategoryToReason(reason) : mapCategoryToReason(category),
          wasted_by_profile_id: userId,
        });

      if (error) {
        console.error('Error logging waste:', error);
        return;
      }

      // Update local state immediately for responsive UI
      const displayCategory = reason === 'expired' || category.toLowerCase().includes('expire') ? 'Expired'
                            : reason === 'spoiled' || category.toLowerCase().includes('spoil') ? 'Spoiled'
                            : reason === 'leftover' || category.toLowerCase().includes('leftover') ? 'Leftover'
                            : 'Other';

      setWasteData(prev => {
        const newByCategory = { ...prev.wasteByCategory };
        if (!newByCategory[displayCategory]) {
          newByCategory[displayCategory] = { count: 0, value: 0 };
        }
        newByCategory[displayCategory].count += 1;
        newByCategory[displayCategory].value += dollarValue;

        return {
          ...prev,
          totalWasted: prev.totalWasted + dollarValue,
          itemsWasted: prev.itemsWasted + 1,
          wasteByCategory: newByCategory,
        };
      });
    } catch (error) {
      console.error('Error logging waste:', error);
    }
  }, [householdId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchSavingsData();
    fetchWasteData();
  }, [fetchSavingsData, fetchWasteData]);

  // Subscribe to realtime updates for savings and waste
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel('savings-waste-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'savings_logs', filter: `household_id=eq.${householdId}` },
        () => fetchSavingsData()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waste_logs', filter: `household_id=eq.${householdId}` },
        () => fetchWasteData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchSavingsData, fetchWasteData]);

  return {
    savingsData,
    wasteData,
    logSavings,
    logWaste,
    refetchSavings: fetchSavingsData,
    refetchWaste: fetchWasteData,
  };
};
