import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimitedAI } from "./useRateLimitedAI";

// --- Interfaces (Kept exactly as you had them) ---
export interface RecipeSuggestion {
  name: string;
  description: string;
  usesIngredients: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  instructions: string[];
  tips?: string;
}

export interface StorageTip {
  tip: string;
  expectedShelfLife: string;
}

export interface WasteAnalysis {
  summary: string;
  topWastedItem: string;
  mainReason: string;
  tips: string[];
  potentialSavings: string;
}

export interface DigitizedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  tags: string[];
}

export interface ShelfLifePrediction {
  daysUntilExpiry: number;
  reasoning: string;
  storageTip: string;
}

// --- Hook Return Type ---
interface UseGeminiChefResult {
  generateRecipe: (items: string[], prompt?: string) => Promise<RecipeSuggestion | null>;
  getStorageTip: (item: string) => Promise<StorageTip | null>;
  predictShelfLife: (itemName: string, category: string) => Promise<ShelfLifePrediction | null>;
  analyzeWaste: (wasteData: { item: string; reason: string; count: number }[]) => Promise<WasteAnalysis | null>;
  digitizeRecipe: (recipeText: string) => Promise<DigitizedRecipe | null>;
  isLoading: boolean;
  error: string | null;
}

export const useGeminiChef = (): UseGeminiChefResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { queueCall, isLoading: isQueued, statusMessage } = useRateLimitedAI();

  // Unified caller for the 'rescue-recipe' function with rate limiting
  const callGeminiChef = useCallback(async <T>(
    taskType: "recipe" | "storage" | "waste_analysis" | "digitize" | "shelf_life",
    payload: Record<string, unknown>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Queue the API call through the rate limiter
      const result = await queueCall(async () => {
        const { data, error: fnError } = await supabase.functions.invoke("rescue-recipe", {
          body: { taskType, ...payload },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        return data as T;
      }, `gemini-${taskType}-${Date.now()}`);

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chef AI failed";
      setError(message);
      console.error("Gemini Chef error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queueCall]);

  // --- Methods ---

  const generateRecipe = useCallback((items: string[], prompt?: string) => 
    callGeminiChef<RecipeSuggestion>("recipe", { ingredients: items, customNote: prompt }), 
  [callGeminiChef]);

  const getStorageTip = useCallback((item: string) => 
    callGeminiChef<StorageTip>("storage", { item }), 
  [callGeminiChef]);

  const analyzeWaste = useCallback((wasteData: any[]) => 
    callGeminiChef<WasteAnalysis>("waste_analysis", { wasteData }), 
  [callGeminiChef]);

  const digitizeRecipe = useCallback((recipeText: string) => 
    callGeminiChef<DigitizedRecipe>("digitize", { text: recipeText }), 
  [callGeminiChef]);

  const predictShelfLife = useCallback((itemName: string, category: string) => 
    callGeminiChef<ShelfLifePrediction>("shelf_life", { itemName, category }), 
  [callGeminiChef]);

  return {
    generateRecipe,
    getStorageTip,
    analyzeWaste,
    digitizeRecipe,
    predictShelfLife,
    isLoading,
    error,
  };
};