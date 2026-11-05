import { useState, useEffect, useCallback } from 'react';

const DASHBOARD_PREFS_KEY = 'twofold_dashboard_prefs';

export const DEFAULT_WIDGET_ORDER = [
  'financial',
  'dailyBriefing',
  'potlucks',
  'dinnerPoll',
  'dinnerMatch',
  'quickRecipe',
  'priorities',
  'wasteReport',
] as const;

export type WidgetKey = typeof DEFAULT_WIDGET_ORDER[number];

export interface DashboardPreferences {
  showFinancial: boolean;
  showPriorities: boolean;
  showQuickRecipe: boolean;
  showPotlucks: boolean;
  showDinnerPoll: boolean;
  showDailyBriefing: boolean;
  showDinnerMatch: boolean;
  layout: 'default' | 'compact' | 'expanded';
  widgetOrder: WidgetKey[];
}

const defaultPreferences: DashboardPreferences = {
  showFinancial: true,
  showPriorities: true,
  showQuickRecipe: false,
  showPotlucks: true,
  showDinnerPoll: false,
  showDailyBriefing: true,
  showDinnerMatch: false,
  layout: 'default',
  widgetOrder: [...DEFAULT_WIDGET_ORDER],
};

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    try {
      const stored = localStorage.getItem(DASHBOARD_PREFS_KEY);
      if (stored) {
        const parsed = { ...defaultPreferences, ...JSON.parse(stored) };
        // Ensure widgetOrder contains all keys
        if (!parsed.widgetOrder || parsed.widgetOrder.length !== DEFAULT_WIDGET_ORDER.length) {
          const existing = (parsed.widgetOrder || []) as WidgetKey[];
          const missing = DEFAULT_WIDGET_ORDER.filter(k => !existing.includes(k));
          parsed.widgetOrder = [...existing.filter((k: WidgetKey) => DEFAULT_WIDGET_ORDER.includes(k)), ...missing];
        }
        return parsed;
      }
    } catch {}
    return defaultPreferences;
  });

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DASHBOARD_PREFS_KEY && e.newValue) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updatePreference = useCallback(<K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reorderWidget = useCallback((fromIndex: number, toIndex: number) => {
    setPreferences(prev => {
      const order = [...prev.widgetOrder];
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      const updated = { ...prev, widgetOrder: order };
      localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(defaultPreferences));
  }, []);

  const refreshPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(DASHBOARD_PREFS_KEY);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  return {
    preferences,
    updatePreference,
    reorderWidget,
    resetPreferences,
    refreshPreferences,
  };
}
