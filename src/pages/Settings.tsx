import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import Navigation from '@/components/Navigation';
import HouseholdInfo from '@/components/HouseholdInfo';
import DeleteDataDialog from '@/components/DeleteDataDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LogOut, User, Settings as SettingsIcon, ShieldAlert, RefreshCw, Loader2, LayoutDashboard, Sparkles, DollarSign, ChefHat, UtensilsCrossed, Vote, Heart, Mic, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardPreferences, WidgetKey } from '@/hooks/useDashboardPreferences';
import { useChefJourney } from '@/hooks/useChefJourney';

const Settings: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const { refetchData } = useHousehold();
  const [isSyncing, setIsSyncing] = useState(false);
  const { preferences, updatePreference, reorderWidget } = useDashboardPreferences();
  const { currentPhase, visibleWidgets } = useChefJourney();
  const [chefPersonality, setChefPersonality] = useState(() => 
    localStorage.getItem('twofold_chef_personality') || 'encouraging'
  );

  const widgetConfig: Record<WidgetKey, { label: string; description: string; icon: React.ReactNode; bgClass: string; checked: boolean; prefKey: keyof typeof preferences }> = {
    financial: { label: 'Financial Tracking', description: 'Savings & waste values', icon: <DollarSign className="w-4 h-4 text-accent-foreground" />, bgClass: 'bg-accent', checked: preferences.showFinancial, prefKey: 'showFinancial' },
    dailyBriefing: { label: 'Daily Briefing', description: 'AI morning meal note', icon: <Sparkles className="w-4 h-4 text-secondary" />, bgClass: 'bg-secondary/10', checked: preferences.showDailyBriefing, prefKey: 'showDailyBriefing' },
    potlucks: { label: 'Potluck Protocol', description: 'Plan group meals', icon: <UtensilsCrossed className="w-4 h-4 text-secondary" />, bgClass: 'bg-secondary/10', checked: preferences.showPotlucks, prefKey: 'showPotlucks' },
    dinnerPoll: { label: 'Dinner Poll', description: 'Vote on meals', icon: <Vote className="w-4 h-4 text-secondary" />, bgClass: 'bg-secondary/10', checked: preferences.showDinnerPoll, prefKey: 'showDinnerPoll' },
    dinnerMatch: { label: 'Dinner Match', description: 'Swipe on AI meal ideas', icon: <Heart className="w-4 h-4 text-primary" />, bgClass: 'bg-primary/10', checked: preferences.showDinnerMatch, prefKey: 'showDinnerMatch' },
    quickRecipe: { label: 'Quick Recipe', description: 'AI recipe suggestions', icon: <ChefHat className="w-4 h-4 text-primary" />, bgClass: 'bg-primary/10', checked: preferences.showQuickRecipe, prefKey: 'showQuickRecipe' },
    priorities: { label: 'Priorities', description: 'Expiring items alert', icon: <Sparkles className="w-4 h-4 text-secondary" />, bgClass: 'bg-secondary/10', checked: preferences.showPriorities, prefKey: 'showPriorities' },
    wasteReport: { label: 'Waste Report', description: 'Monthly waste tracking', icon: <DollarSign className="w-4 h-4 text-accent-foreground" />, bgClass: 'bg-accent', checked: preferences.showFinancial, prefKey: 'showFinancial' },
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLeaveHousehold = () => {
    window.location.href = '/onboarding';
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await refetchData();
      toast.success('Data synced successfully!', {
        description: 'Inventory, recipes, and grocery list are now up to date.',
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and household</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="font-display">Account</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Dashboard Customization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Dashboard</CardTitle>
                  <CardDescription>Customize your home screen</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Widget Toggles - Rendered in user's custom order */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Widgets</h4>
                
                {preferences.widgetOrder.map((key, index) => {
                  const config = widgetConfig[key];
                  if (!config) return null;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${config.bgClass} flex items-center justify-center shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => reorderWidget(index, index - 1)}
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === preferences.widgetOrder.length - 1}
                          onClick={() => reorderWidget(index, index + 1)}
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Switch
                          checked={config.checked}
                          onCheckedChange={(checked) => {
                            updatePreference(config.prefKey, checked);
                            toast.success(checked ? `${config.label} enabled` : `${config.label} hidden`);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Layout Options */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-medium text-foreground pt-2">Layout</h4>
                <RadioGroup
                  value={preferences.layout}
                  onValueChange={(value) => {
                    updatePreference('layout', value as 'default' | 'compact' | 'expanded');
                    toast.success(`Layout changed to ${value}`);
                  }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div>
                    <RadioGroupItem value="default" id="layout-default" className="peer sr-only" />
                    <Label
                      htmlFor="layout-default"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-card p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <div className="w-8 h-6 rounded bg-muted mb-2 flex flex-col gap-0.5 p-1">
                        <div className="w-full h-1 bg-muted-foreground/30 rounded-sm" />
                        <div className="w-full h-1 bg-muted-foreground/30 rounded-sm" />
                        <div className="w-full h-1 bg-muted-foreground/30 rounded-sm" />
                      </div>
                      <span className="text-xs font-medium">Default</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="compact" id="layout-compact" className="peer sr-only" />
                    <Label
                      htmlFor="layout-compact"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-card p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <div className="w-8 h-6 rounded bg-muted mb-2 flex flex-col gap-0.5 p-1">
                        <div className="w-full h-0.5 bg-muted-foreground/30 rounded-sm" />
                        <div className="w-full h-0.5 bg-muted-foreground/30 rounded-sm" />
                      </div>
                      <span className="text-xs font-medium">Compact</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="expanded" id="layout-expanded" className="peer sr-only" />
                    <Label
                      htmlFor="layout-expanded"
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-card p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                    >
                      <div className="w-8 h-6 rounded bg-muted mb-2 flex flex-col gap-0.5 p-1">
                        <div className="w-full h-2 bg-muted-foreground/30 rounded-sm" />
                        <div className="w-full h-2 bg-muted-foreground/30 rounded-sm" />
                      </div>
                      <span className="text-xs font-medium">Expanded</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Chef Personality */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="font-display">Chef Personality</CardTitle>
                  <CardDescription>Set the tone for AI responses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={chefPersonality}
                onValueChange={(value) => {
                  setChefPersonality(value);
                  localStorage.setItem('twofold_chef_personality', value);
                  toast.success(`Chef personality set to ${value}`);
                }}
                className="space-y-3"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="encouraging" id="tone-encouraging" />
                  <Label htmlFor="tone-encouraging" className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium">🤗 Encouraging</p>
                    <p className="text-xs text-muted-foreground">Warm, supportive, enthusiastic</p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="efficient" id="tone-efficient" />
                  <Label htmlFor="tone-efficient" className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium">⚡ Efficient</p>
                    <p className="text-xs text-muted-foreground">Brief, direct, no fluff</p>
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="sassy" id="tone-sassy" />
                  <Label htmlFor="tone-sassy" className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium">😏 Sassy</p>
                    <p className="text-xs text-muted-foreground">Playful, witty, cheeky</p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Sync Data */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Sync Data</CardTitle>
                  <CardDescription>Force refresh all data from server</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If your data seems out of sync across devices, use this to force a fresh fetch from the database.
              </p>
              <Button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync All Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Household Info - Phase 3+ */}
          {currentPhase >= 3 ? (
            <HouseholdInfo onLeaveHousehold={handleLeaveHousehold} />
          ) : (
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Household</CardTitle>
                    <CardDescription>Cook your first recipe to unlock household sharing</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="font-display">Data & Privacy</CardTitle>
                  <CardDescription>Manage your personal data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Request deletion of all your personal data. This action is permanent and cannot be undone.
              </p>
              <DeleteDataDialog />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
