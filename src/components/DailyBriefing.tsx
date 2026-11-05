import React, { useState, useEffect } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StagedRecipe } from '@/types/recipe';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/operatorTracking';

const CACHE_KEY = 'twofold_daily_briefing';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

interface CachedBriefing {
  message: string;
  recipeName?: string;
  timestamp: number;
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  encouraging: 'Be warm, supportive, and enthusiastic.',
  efficient: 'Be brief and direct. No fluff.',
  sassy: 'Be playful and witty with a cheeky edge.',
};

const DailyBriefing: React.FC = () => {
  const { inventory, addSavedRecipe } = useHousehold();
  const [briefing, setBriefing] = useState<CachedBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get expiring items (within 48 hours)
  const expiringItems = inventory.filter(item => {
    if (item.quantity <= 0 || !item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    const hoursUntil = (expiry.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 48;
  });

  // Check cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedBriefing = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setBriefing(parsed);
          return;
        }
      }
    } catch {}
    // Auto-generate if items are expiring
    if (expiringItems.length > 0) {
      generateBriefing();
    }
  }, []);

  const generateBriefing = async () => {
    if (expiringItems.length === 0) return;
    setIsLoading(true);

    try {
      const personality = localStorage.getItem('twofold_chef_personality') || 'encouraging';
      const toneInstruction = PERSONALITY_PROMPTS[personality] || '';
      const itemNames = expiringItems.map(i => i.name).slice(0, 6);

      const { data, error } = await supabase.functions.invoke('dinner-match', {
        body: {
          ingredients: itemNames,
          taskType: 'daily_briefing',
          servings: 2,
          tone: personality,
        },
      });

      if (error) throw error;

      const cached: CachedBriefing = {
        message: data?.description || `Use up your ${itemNames.slice(0, 3).join(', ')} today!`,
        recipeName: data?.name,
        timestamp: Date.now(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      setBriefing(cached);
    } catch (err: any) {
      console.error('Daily briefing error:', err);
      trackEvent({ type: 'api_error', name: 'dinner-match', error: err?.message || 'Daily briefing generation failed', statusCode: 500 });
      const fallback: CachedBriefing = {
        message: `You have ${expiringItems.length} item${expiringItems.length > 1 ? 's' : ''} expiring soon: ${expiringItems.map(i => i.name).slice(0, 3).join(', ')}. Time to get creative!`,
        timestamp: Date.now(),
      };
      setBriefing(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCookbook = async () => {
    if (!briefing || isSaving) return;

    const itemNames = expiringItems.map(i => i.name).slice(0, 6);
    if (itemNames.length === 0) return;

    setIsSaving(true);
    try {
      const personality = localStorage.getItem('twofold_chef_personality') || 'encouraging';
      const { data, error } = await supabase.functions.invoke('rescue-recipe', {
        body: {
          ingredients: itemNames,
          customNote: `Create a full recipe for: "${briefing.recipeName || briefing.message}"`,
          servings: 2,
          tone: personality,
        },
      });

      if (error) throw error;

      const ingredientsList = data?.ingredients
        ? data.ingredients.map((ing: any) => ({
            item: ing.item, qty: ing.qty, unit: ing.unit, notes: ''
          }))
        : [];

      const staged: StagedRecipe = {
        title: data?.name || briefing.recipeName || 'Daily Briefing Recipe',
        description: data?.description || briefing.message,
        servings: data?.metrics?.servings ?? 2,
        ingredients: ingredientsList,
        instructions: (data?.instructions || []).map((inst: any) =>
          typeof inst === 'string' ? inst : (inst as any).instruction || String(inst)
        ),
        metrics: {
          prep_time: data?.metrics?.prep_time ?? 15,
          cook_time: data?.metrics?.cook_time ?? 20,
        },
      };

      addSavedRecipe(staged, ['Daily Briefing']);
      toast.success(`"${staged.title}" saved to cookbook! 📖`);
    } catch (err: any) {
      console.error('Briefing save error:', err);
      trackEvent({ type: 'api_error', name: 'rescue-recipe', error: err?.message || 'Briefing cookbook save failed', statusCode: 500 });
      toast.error('Failed to generate full recipe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Daily Briefing
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                <span className="text-sm text-muted-foreground">Preparing your briefing...</span>
              </div>
            ) : briefing ? (
              <div
                className={cn(
                  "cursor-pointer rounded-lg p-2 -m-2 transition-colors",
                  isSaving ? "opacity-60 pointer-events-none" : "hover:bg-secondary/5 active:bg-secondary/10"
                )}
                onClick={handleSaveToCookbook}
                title="Click to save as a full recipe"
              >
                {briefing.recipeName && (
                  <p className="font-semibold text-foreground text-sm mb-1">{briefing.recipeName}</p>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{briefing.message}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-secondary">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Saving to cookbook...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3 h-3" />
                      <span>Tap to save to cookbook</span>
                    </>
                  )}
                </div>
              </div>
            ) : expiringItems.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring soon
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No items expiring soon — your kitchen is in great shape! 🌿
              </p>
            )}
          </div>
          {!isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={generateBriefing}
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyBriefing;
