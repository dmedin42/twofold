import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/household';
import { StagedRecipe } from '@/types/recipe';

export const useRecipeLogic = (householdId: string | null, userId: string | null) => {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);

  const fetchRecipes = useCallback(async () => {
    if (!householdId) return;
    const { data } = await (supabase as any)
      .from('recipes')
      .select('id, name, description, ingredients, instructions, servings, prep_time, cook_time, tags, created_at, created_by_profile_id')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    if (data) {
      setSavedRecipes(data.map((r: any) => ({
        id: r.id, 
        name: r.name, 
        description: r.description,
        ingredients: r.ingredients?.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })) || [],
        instructions: r.instructions || [], 
        servings: r.servings, 
        prepTime: r.prep_time, 
        cookTime: r.cook_time,
        tags: Array.isArray(r.tags) ? r.tags : [], 
        createdAt: r.created_at, 
        createdByUid: r.created_by_profile_id, 
        isLiked: false
      })));
    }
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    fetchRecipes();
    const channel = supabase.channel('recipe-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, fetchRecipes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchRecipes]);

  const addSavedRecipe = useCallback(async (staged: StagedRecipe, tags: string[] = []) => {
    if (!householdId || !userId) {
      console.error('addSavedRecipe: missing householdId or userId', { householdId, userId });
      return;
    }
    // Ensure tags is always a proper array, never null
    const safeTags = Array.isArray(tags) ? tags.filter(t => t && t.trim()) : [];
    const { data: inserted, error } = await (supabase as any).from('recipes').insert({
      household_id: householdId, name: staged.title, description: staged.description || `${staged.metrics.prep_time}m prep`,
      ingredients: staged.ingredients.map(i => ({ name: i.item, quantity: i.qty, unit: i.unit })),
      instructions: staged.instructions, servings: staged.servings,
      prep_time: staged.metrics.prep_time, cook_time: staged.metrics.cook_time, 
      tags: safeTags, 
      created_by_profile_id: userId
    }).select('id, created_at').single();
    if (error) {
      console.error('addSavedRecipe insert failed:', error);
      return;
    }
    if (inserted) {
      // Milestone: emit custom event for chef journey
      window.dispatchEvent(new CustomEvent('chef-milestone', { detail: { type: 'recipe_saved' } }));
      setSavedRecipes(prev => [{
        id: inserted.id, name: staged.title, description: staged.description || `${staged.metrics.prep_time}m prep`,
        ingredients: staged.ingredients.map(i => ({ name: i.item, quantity: i.qty, unit: i.unit })),
        instructions: staged.instructions, servings: staged.servings,
        prepTime: staged.metrics.prep_time, cookTime: staged.metrics.cook_time,
        tags: safeTags, createdAt: inserted.created_at, createdByUid: userId, isLiked: false,
      }, ...prev]);
    }
  }, [householdId, userId]);

  const removeSavedRecipe = useCallback(async (id: string) => {
    await (supabase as any).from('recipes').delete().eq('id', id);
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleRecipeLike = useCallback((id: string) => {
    setSavedRecipes(prev => prev.map(r => r.id === id ? { ...r, isLiked: !r.isLiked } : r));
  }, []);

  const updateSavedRecipe = useCallback(async (id: string, updates: any) => {
    // Ensure tags is always a proper array if included
    const safeUpdates = { ...updates };
    if ('tags' in safeUpdates) {
      safeUpdates.tags = Array.isArray(safeUpdates.tags) 
        ? safeUpdates.tags.filter((t: string) => t && t.trim()) 
        : [];
    }
    await (supabase as any).from('recipes').update(safeUpdates).eq('id', id);
    fetchRecipes();
  }, [fetchRecipes]);

  return { savedRecipes, addSavedRecipe, removeSavedRecipe, toggleRecipeLike, updateSavedRecipe };
};
