import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { findStorageTip, getEstimatedShelfLife } from '@/data/storageTips';
import { SupabaseClient } from '@supabase/supabase-js';

// Untyped client for tables not in generated types
const untypedSupabase = supabase as SupabaseClient;

// Type for storage tips from database
interface DbStorageTip {
  tip: string;
  expected_shelf_life: string;
}

interface StorageTipResult {
  tip: string;
  expectedShelfLife: string;
  source: 'local' | 'database' | 'ai' | 'fallback';
}

interface UseStorageTipsResult {
  getStorageTip: (itemName: string, category?: string) => Promise<StorageTipResult>;
  isLoading: boolean;
  error: string | null;
}

// Normalize item name for consistent matching
function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export const useStorageTips = (): UseStorageTipsResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStorageTip = useCallback(async (itemName: string, category?: string): Promise<StorageTipResult> => {
    setIsLoading(true);
    setError(null);

    const normalizedName = normalizeItemName(itemName);

    try {
      // 1. Check local static database first (instant)
      const localTip = findStorageTip(itemName);
      if (localTip) {
        setIsLoading(false);
        return {
          tip: localTip.tip,
          expectedShelfLife: getEstimatedShelfLife(localTip.category),
          source: 'local'
        };
      }

      // 2. Check Supabase database for previously fetched tips (if table exists)
      try {
        const { data: dbTip, error: dbError } = await untypedSupabase
          .from('storage_tips')
          .select('tip, expected_shelf_life')
          .eq('item_name_normalized', normalizedName)
          .maybeSingle() as { data: DbStorageTip | null; error: Error | null };

        if (dbTip && !dbError) {
          setIsLoading(false);
          return {
            tip: dbTip.tip,
            expectedShelfLife: dbTip.expected_shelf_life,
            source: 'database'
          };
        }
      } catch {
        // Table may not exist yet, continue to AI
        console.log('storage_tips table not available, falling back to AI');
      }

      // 3. Call AI only if not found in local or database
      const { data: aiData, error: aiError } = await supabase.functions.invoke('openai-completion', {
        body: { taskType: 'storage', items: [itemName] }
      });

      if (aiError) {
        throw new Error(aiError.message);
      }

      if (aiData?.data?.tip) {
        const aiTip = {
          tip: aiData.data.tip,
          expectedShelfLife: aiData.data.expectedShelfLife || 'Varies by storage method',
          source: 'ai' as const
        };

        // 4. Save AI result to database for future users (fire and forget)
        untypedSupabase
          .from('storage_tips')
          .insert({
            item_name: itemName,
            item_name_normalized: normalizedName,
            tip: aiTip.tip,
            expected_shelf_life: aiTip.expectedShelfLife,
            category: category || null,
            source: 'ai'
          })
          .then(({ error: insertError }) => {
            if (insertError) {
              console.warn('Failed to save AI tip to database:', insertError.message);
            }
          });

        setIsLoading(false);
        return aiTip;
      }

      // 5. Fallback if AI fails
      throw new Error('No tip returned from AI');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get storage tip';
      setError(message);
      console.error('Storage tip error:', err);

      // Return category-based fallback
      const categoryTips: Record<string, string> = {
        Dairy: "Keep refrigerated at 35-40°F. Store on inner shelves, not the door.",
        Produce: "Store in crisper drawer. Don't wash until ready to use.",
        Bakery: "Store in a bread box or freeze for longer storage.",
        Snacks: "Keep in airtight container in a cool, dry place.",
        Pantry: "Store in airtight container away from heat and light.",
        Meat: "Keep on bottom shelf of fridge. Use or freeze within 1-2 days.",
        Frozen: "Keep at 0°F or below. Squeeze air out of bags.",
        Beverages: "Store in cool place away from direct sunlight."
      };

      setIsLoading(false);
      return {
        tip: categoryTips[category || ''] || "Store in a cool, dry place in an airtight container.",
        expectedShelfLife: "Varies by item - check packaging",
        source: 'fallback'
      };
    }
  }, []);

  return {
    getStorageTip,
    isLoading,
    error
  };
};
