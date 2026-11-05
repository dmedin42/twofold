import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHousehold } from '@/contexts/HouseholdContext';
import Navigation from '@/components/Navigation';
import FreshnessHero from '@/components/FreshnessHero';
import ZeroWasteImpact from '@/components/ZeroWasteImpact';
import MonthlyWasteReport from '@/components/MonthlyWasteReport';
import QuickRecipeWidget from '@/components/QuickRecipeWidget';
import PotluckWidget from '@/components/potluck/PotluckWidget';
import DinnerPollWidget from '@/components/DinnerPollWidget';
import DailyBriefing from '@/components/DailyBriefing';
import DinnerMatch from '@/components/DinnerMatch';
import ChefErrorBoundary from '@/components/ChefErrorBoundary';
import AILoadingOverlay from '@/components/AILoadingOverlay';
import ChefProgressBar from '@/components/ChefProgressBar';
import WelcomeNudgeCard from '@/components/WelcomeNudgeCard';
import { useChefJourney } from '@/hooks/useChefJourney';
import { Settings, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardPreferences, WidgetKey } from '@/hooks/useDashboardPreferences';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { inventory, activeUser, savedRecipes, isLoading, savingsData } = useHousehold();
  const { preferences, refreshPreferences } = useDashboardPreferences();
  const { currentPhase, visibleWidgets } = useChefJourney();
  
  useEffect(() => {
    const handleFocus = () => refreshPreferences();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshPreferences]);
  
  const activeInventoryCount = inventory.filter(item => item.quantity > 0).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const containerClass = cn(
    "container px-4 py-6 mx-auto",
    preferences.layout === 'compact' ? 'max-w-md' : preferences.layout === 'expanded' ? 'max-w-2xl' : 'max-w-xl'
  );

  const widgetMap: Record<WidgetKey, { enabled: boolean; content: React.ReactNode }> = {
    financial: {
      enabled: preferences.showFinancial && visibleWidgets.includes('financial'),
      content: <ChefErrorBoundary fallbackTitle="Impact tracker temporarily unavailable"><ZeroWasteImpact /></ChefErrorBoundary>,
    },
    dailyBriefing: {
      enabled: preferences.showDailyBriefing && visibleWidgets.includes('dailyBriefing'),
      content: <ChefErrorBoundary fallbackTitle="Daily briefing temporarily unavailable"><DailyBriefing /></ChefErrorBoundary>,
    },
    potlucks: {
      enabled: preferences.showPotlucks && visibleWidgets.includes('potlucks'),
      content: <ChefErrorBoundary><PotluckWidget /></ChefErrorBoundary>,
    },
    dinnerPoll: {
      enabled: preferences.showDinnerPoll && visibleWidgets.includes('dinnerPoll'),
      content: <ChefErrorBoundary><DinnerPollWidget /></ChefErrorBoundary>,
    },
    dinnerMatch: {
      enabled: preferences.showDinnerMatch && visibleWidgets.includes('dinnerMatch'),
      content: <ChefErrorBoundary fallbackTitle="Dinner Match temporarily unavailable"><DinnerMatch /></ChefErrorBoundary>,
    },
    quickRecipe: {
      enabled: preferences.showQuickRecipe && visibleWidgets.includes('quickRecipe'),
      content: <ChefErrorBoundary><QuickRecipeWidget /></ChefErrorBoundary>,
    },
    priorities: {
      enabled: preferences.showPriorities && visibleWidgets.includes('priorities'),
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Priorities</h3>
          </div>
          <ChefErrorBoundary><FreshnessHero /></ChefErrorBoundary>
        </div>
      ),
    },
    wasteReport: {
      enabled: preferences.showFinancial && visibleWidgets.includes('wasteReport'),
      content: <ChefErrorBoundary><MonthlyWasteReport /></ChefErrorBoundary>,
    },
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navigation />
      <AILoadingOverlay />
      
      <main className={containerClass}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {activeUser ? `Hi, ${activeUser.name.split(' ')[0]}` : 'Twofold'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your kitchen is under control.
            </p>
          </div>
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
        </div>

        {/* Chef Progress Bar (replaces old milestone icons) */}
        <ChefProgressBar />

        {/* Welcome Nudge for Phase 1 */}
        {currentPhase === 1 && <WelcomeNudgeCard />}

        {/* Dynamic Widgets */}
        {preferences.widgetOrder.map((key) => {
          const widget = widgetMap[key];
          if (!widget || !widget.enabled) return null;
          return (
            <div key={key} className={cn("mb-8", preferences.layout === 'compact' && 'mb-6')}>
              {widget.content}
            </div>
          );
        })}

      </main>
    </div>
  );
};

export default Dashboard;
