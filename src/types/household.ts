export type UserRole = 'admin' | 'member';

export interface UserProfile {
  uid: string;
  name: string;
  color: string;
  avatar?: string;
  role: UserRole;
}

export interface Household {
  id: string;
  name: string;
  profiles: UserProfile[];
}

export type ItemOwnership = 'global' | string; // 'global' or a user UID

export type ExpiryStatus = 'fresh' | 'warning' | 'expired';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  ownerUid: ItemOwnership;
  lastBoughtByUid: string;
  isPrivate: boolean;
  addedAt: string;
  batchId?: string; // Groups items from same check-in session
  shelfLifeDays?: number; // Original shelf life in days for reference
  usageCount: number; // How many times this item type has been used/restocked
  isFrequentStaple?: boolean; // Computed: usageCount >= STAPLE_THRESHOLD
  isFrozen?: boolean; // Item is in freezer, shelf life paused
  frozenAt?: string; // When the item was frozen
  daysRemainingWhenFrozen?: number; // Days left until expiry when frozen
  isPinned?: boolean; // Manually pinned to Quick Add grid
}

// Categories that can be frozen
export const FREEZABLE_CATEGORIES = ['Meat', 'Dairy', 'Produce', 'Bakery', 'Frozen'] as const;

// Frequency threshold for "staple" classification (items bought more than this count)
export const STAPLE_THRESHOLD = 5;

// Pinned item with metadata for persistence
export interface PinnedItem {
  name: string;
  category: string;
  unit: string;
  shelfLifeDays?: number;
}

export interface GroceryListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  addedByUid: string;
  addedAt: string;
  isPurchased: boolean;
  purchasedAt?: string; // ISO timestamp when item was marked as purchased
}

export interface SpendingLog {
  id: string;
  receiptId: string;
  buyerUid: string;
  amount: number;
  store: string;
  date: string;
  itemCount: number;
}

export interface SpendingInsight {
  totalSpend: number;
  userBreakdown: {
    uid: string;
    amount: number;
    percentage: number;
  }[];
  topStores: {
    name: string;
    amount: number;
    visits: number;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
  }[];
}

// Recipe types
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  servings: number;
  prepTime: number;
  cookTime: number;
  tags: string[];
  createdAt: string;
  createdByUid: string;
  imageUrl?: string;
  isLiked?: boolean;
}
