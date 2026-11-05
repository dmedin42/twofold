import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Household, GroceryListItem, InventoryItem, SpendingLog, PinnedItem, Recipe } from '@/types/household';
import { useAuthContext } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StagedRecipe } from '@/types/recipe';

// Import our new sub-hooks
import { useInventoryLogic } from '@/hooks/household/useInventoryLogic';
import { useGroceryLogic } from '@/hooks/household/useGroceryLogic';
import { useRecipeLogic } from '@/hooks/household/useRecipeLogic';
import { useWeeklySavings } from '@/hooks/useWeeklySavings';

interface SavingsData { totalSavings: number; itemsRescued: number; weeklySavings: number; weeklyItemsRescued: number; weekStart?: string; weekEnd?: string; }
interface WasteData { totalWasted: number; itemsWasted: number; monthStart: string; monthEnd: string; wasteByCategory: Record<string, { count: number; value: number }>; topWastedItems: { name: string; count: number; value: number }[]; }

// Combined Interface (Keep this so other files don't break)
interface HouseholdContextType {
  household: Household | null;
  activeUser: UserProfile | null;
  setActiveUser: (user: UserProfile | null) => void;
  inventory: InventoryItem[];
  groceryList: GroceryListItem[];
  spendingLogs: SpendingLog[];
  addToGroceryList: (item: Omit<GroceryListItem, 'id' | 'addedAt' | 'isPurchased'>) => Promise<void>;
  toggleGroceryItem: (id: string) => void;
  removeFromGroceryList: (id: string) => void;
  getUserById: (uid: string) => UserProfile | undefined;
  isIdle: boolean;
  setIsIdle: (idle: boolean) => void;
  addProfile: (profile: Omit<UserProfile, 'uid'>) => void;
  updateHouseholdName: (name: string) => void;
  addInventoryItem: (item: any) => Promise<boolean>;
  removeInventoryItem: (id: string) => void;
  markItemGone: (id: string, wasUsed?: boolean) => void;
  throwAwayItem: (id: string, reason?: string) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateInventoryItem: (id: string, updates: { quantity?: number; expiryDate?: string }) => Promise<void>;
  toggleFreezeItem: (id: string) => void;
  togglePinItem: (item: PinnedItem) => void;
  getPinnedItems: () => PinnedItem[];
  getLifetimeUsageCount: (itemName: string) => number;
  getSortedInventory: () => InventoryItem[];
  getExpiringStaples: (withinDays?: number) => InventoryItem[];
  getGoneStaples: () => InventoryItem[];
  savedRecipes: Recipe[];
  addSavedRecipe: (recipe: StagedRecipe, tags?: string[]) => void;
  removeSavedRecipe: (id: string) => void;
  toggleRecipeLike: (id: string) => void;
  updateSavedRecipe: (id: string, updates: any) => void;
  isLoading: boolean;
  refetchData: () => Promise<void>;
  mergeInventoryItems: (s: string, t: string, n: string, q: number, u: string) => Promise<boolean>;
  savingsData: SavingsData;
  wasteData: WasteData;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [household, setHousehold] = useState<Household | null>(null);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);

  // 1. Fetch User & Household Logic
  const fetchUserAndHousehold = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await (supabase as any).from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (profile) {
      setActiveUser({ uid: profile.id, name: profile.name, color: '#7D9082', role: 'member', avatar: profile.avatar_url });
      if (profile.household_id) {
        const { data: hh } = await (supabase as any).from('households').select('*').eq('id', profile.household_id).maybeSingle();
        const { data: profs } = await (supabase as any).from('profiles').select('id, name, avatar_url, household_id, user_id').eq('household_id', profile.household_id);
        setHousehold({
          id: hh.id, name: hh.name,
          profiles: profs.map((p: any) => ({ uid: p.id, name: p.name, color: '#7D9082', role: 'member', avatar: p.avatar_url }))
        });
        // Dispatch member count for chef journey progression
        const memberCount = profs.length;
        window.dispatchEvent(new CustomEvent('chef-milestone', {
          detail: { type: 'household_member', count: memberCount }
        }));
      }
    }
  }, [user]);

  useEffect(() => { fetchUserAndHousehold(); }, [fetchUserAndHousehold]);

  // 2. Weekly Savings & Waste Hook (persistent)
  const { savingsData, wasteData, logSavings, logWaste } = useWeeklySavings(household?.id || null, activeUser?.uid || null);

  // 3. Initialize Sub-Hooks
  const inventoryLogic = useInventoryLogic(household?.id || null, activeUser?.uid || null, logSavings);
  const groceryLogic = useGroceryLogic(household?.id || null, activeUser?.uid || null);
  const recipeLogic = useRecipeLogic(household?.id || null, activeUser?.uid || null);

  // Throw away item function (logs waste)
  const throwAwayItem = useCallback(async (id: string, reason?: string) => {
    const item = inventoryLogic.inventory.find(i => i.id === id);
    if (!item) return;
    
    // Calculate value
    const CATEGORY_VALUES: Record<string, number> = {
      'Produce': 1.50, 'Meat': 4.00, 'Dairy': 2.50, 'Bakery': 2.00, 'Frozen': 3.00,
      'Beverages': 1.75, 'Snacks': 1.50, 'Pantry': 1.00, 'Other': 1.00,
    };
    const value = CATEGORY_VALUES[item.category] || 1;
    const totalValue = value * (item.quantity || 1);
    
    // Log waste
    await logWaste(totalValue, item.name, item.category, reason);
    
    // Remove from inventory
    await inventoryLogic.removeInventoryItem(id);
  }, [inventoryLogic.inventory, inventoryLogic.removeInventoryItem, logWaste]);

  // 4. Stubs
  const getUserById = (uid: string) => household?.profiles.find(p => p.uid === uid);
  const isIdle = false;
  const setIsIdle = () => {};
  const addProfile = () => {};
  const updateHouseholdName = () => {};
  const spendingLogs: SpendingLog[] = [];

  return (
    <HouseholdContext.Provider value={{
      household, activeUser, setActiveUser, savingsData, wasteData, isLoading: !household, refetchData: fetchUserAndHousehold,
      getUserById, isIdle, setIsIdle, addProfile, updateHouseholdName, spendingLogs,
      throwAwayItem,
      
      // Inventory
      ...inventoryLogic,
      
      // Groceries
      ...groceryLogic,
      
      // Recipes
      ...recipeLogic
    }}>
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (context === undefined) throw new Error('useHousehold must be used within a HouseholdProvider');
  return context;
};
