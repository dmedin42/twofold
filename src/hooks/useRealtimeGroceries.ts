import { useHousehold } from '@/contexts/HouseholdContext';
import { GroceryListItem } from '@/types/household';

export const useRealtimeGroceries = () => {
  const { groceryList, addToGroceryList, toggleGroceryItem, removeFromGroceryList, isLoading } = useHousehold();

  // Return the live data directly from the Household Context
  // This is already fully real-time synchronized via Supabase
  return {
    groceries: groceryList,
    addGrocery: addToGroceryList,
    toggleGrocery: toggleGroceryItem,
    removeGrocery: removeFromGroceryList,
    loading: isLoading
  };
};