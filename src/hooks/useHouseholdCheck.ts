import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface UseHouseholdCheckResult {
  hasHousehold: boolean | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useHouseholdCheck = (): UseHouseholdCheckResult => {
  const { user } = useAuthContext();
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkHousehold = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setHasHousehold(null);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use type assertion for tables not in generated types
      const { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking household:', error);
        setHasHousehold(false);
      } else {
        setHasHousehold(!!profile?.household_id);
      }
    } catch (error) {
      console.error('Error:', error);
      setHasHousehold(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkHousehold();
  }, [checkHousehold]);

  return {
    hasHousehold,
    isLoading,
    refetch: checkHousehold,
  };
};
