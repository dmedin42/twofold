export interface Potluck {
  id: string;
  household_id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  is_public: boolean;
  share_code: string;
  category_limits?: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface PotluckItem {
  id: string;
  potluck_id: string;
  item_name: string;
  category: string;
  claimed_by_name?: string | null;
  claimed_by_user_id?: string | null;
  notes?: string | null;
  is_needed: boolean;
  created_at: string;
  updated_at: string;
}

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export interface PotluckRsvp {
  id: string;
  potluck_id: string;
  guest_name: string;
  user_id?: string | null;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export interface PotluckWithItems extends Potluck {
  items: PotluckItem[];
  rsvps?: PotluckRsvp[];
}

export type PotluckCategory = 
  | 'Main Dish'
  | 'Side Dish'
  | 'Appetizer'
  | 'Dessert'
  | 'Drinks'
  | 'Utensils'
  | 'Other';

export const POTLUCK_CATEGORIES: PotluckCategory[] = [
  'Main Dish',
  'Side Dish',
  'Appetizer',
  'Dessert',
  'Drinks',
  'Utensils',
  'Other',
];

export const DEFAULT_CATEGORY_LIMITS: Record<PotluckCategory, number> = {
  'Main Dish': 3,
  'Side Dish': 5,
  'Appetizer': 4,
  'Dessert': 3,
  'Drinks': 4,
  'Utensils': 2,
  'Other': 10,
};
