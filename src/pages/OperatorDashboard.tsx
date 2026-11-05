import React, { useState, useEffect, useCallback } from 'react';
import { useOperatorEvents } from '@/hooks/useOperatorEvents';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, AlertTriangle, BarChart3, Clock, 
  RefreshCw, TrendingUp, Zap, ShieldAlert,
  ChevronDown, ChevronUp, ZapOff, History, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'sonner';

interface JourneyFunnelData {
  milestone: string;
  count: number;
  total: number;
  percentage: number;
}

const OperatorDashboard: React.FC = () => {
  const [dateRange] = useState({
    start: subDays(new Date(), 7),
    end: new Date(),
  });
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const { isAiEnabled, toggleAiEnabled } = useSystemSettings();
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [funnelData, setFunnelData] = useState<JourneyFunnelData[]>([]);

  const {
    isLoading,
    error,
    isAdmin,
    summary,
    events,
    aggregatedByName,
    dailyStats,
    errorBreakdown,
    refetch,
  } = useOperatorEvents(dateRange);

  // Fetch onboarding funnel data
  const fetchFunnelData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await (supabase as any)
        .from('chef_journey_stats')
        .select('items_added, has_used_ai, has_cooked, has_shared_story');

      if (error) throw error;
      const total = data?.length || 0;
      if (total === 0) return;

      setFunnelData([
        { milestone: 'Added Item', count: data.filter((d: any) => d.items_added > 0).length, total, percentage: 0 },
        { milestone: 'Used AI', count: data.filter((d: any) => d.has_used_ai).length, total, percentage: 0 },
        { milestone: 'Cooked', count: data.filter((d: any) => d.has_cooked).length, total, percentage: 0 },
        { milestone: 'Shared Story', count: data.filter((d: any) => d.has_shared_story).length, total, percentage: 0 },
      ].map(d => ({ ...d, percentage: Math.round((d.count / d.total) * 100) })));
    } catch (err) {
      console.debug('Funnel data fetch error:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchFunnelData();
  }, [fetchFunnelData]);

  const handleToggleAi = async (enabled: boolean) => {
    setIsTogglingAi(true);
    const success = await toggleAiEnabled(enabled);
    setIsTogglingAi(false);
    if (success) {
      toast.success(enabled ? 'AI systems enabled' : 'AI systems disabled');
    } else {
      toast.error('Failed to toggle AI setting');
    }
  };

  // Compute success rate
  const apiEvents = events.filter(e => e.event_type === 'api_call' || e.event_type === 'api_error');
  const successEvents = events.filter(e => e.event_type === 'api_call' && (e.status_code === 200 || !e.status_code));
  const successRate = apiEvents.length > 0 ? Math.round((successEvents.length / apiEvents.length) * 100) : 100;

  // Compute daily success rates for chart
  const dailySuccessRates = (() => {
    const map = new Map<string, { total: number; success: number }>();
    apiEvents.forEach(e => {
      const date = e.created_at.split('T')[0];
      const existing = map.get(date) || { total: 0, success: 0 };
      existing.total++;
      if (e.event_type === 'api_call') existing.success++;
      map.set(date, existing);
    });
    return Array.from(map.entries())
      .map(([date, stats]) => ({
        date,
        rate: Math.round((stats.success / stats.total) * 100),
        total: stats.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Recent errors for triage
  const recentErrors = events
    .filter(e => e.event_type === 'api_error')
    .slice(0, 10);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-display font-semibold mb-2">Access Denied</h1>
            <p className="text-muted-foreground text-center max-w-md">
              {error || 'You need administrator privileges to view this dashboard.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const aggregated = aggregatedByName();
  const daily = dailyStats();
  const errors = errorBreakdown();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navigation />
      
      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Operator Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Last 7 days · {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Circuit Breaker */}
        <Card className={cn(
          "border-2 transition-colors",
          isAiEnabled ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isAiEnabled ? "bg-green-500/10" : "bg-destructive/10"
                )}>
                  {isAiEnabled ? (
                    <Zap className="w-5 h-5 text-green-600" />
                  ) : (
                    <ZapOff className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">
                    Global AI Circuit Breaker
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAiEnabled ? 'All AI systems operational' : 'AI systems are OFFLINE — 503 responses active'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isAiEnabled}
                onCheckedChange={handleToggleAi}
                disabled={isTogglingAi}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.totalApiCalls}</p>
                  <p className="text-xs text-muted-foreground">API Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.totalErrors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.totalFeatureUses}</p>
                  <p className="text-xs text-muted-foreground">Feature Uses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  successRate >= 90 ? "bg-green-500/10" : successRate >= 70 ? "bg-amber-500/10" : "bg-destructive/10"
                )}>
                  <BarChart3 className={cn(
                    "w-5 h-5",
                    successRate >= 90 ? "text-green-600" : successRate >= 70 ? "text-amber-500" : "text-destructive"
                  )} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Rate Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              API Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySuccessRates.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySuccessRates}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => format(new Date(d), 'MMM d')}
                      className="text-xs"
                    />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Success Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No API data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Funnel */}
        {funnelData.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                Chef's Journey Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((item) => (
                  <div key={item.milestone} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.milestone}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.count}/{item.total} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Activity Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => format(new Date(d), 'MMM d')}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Line type="monotone" dataKey="apiCalls" stroke="hsl(var(--primary))" strokeWidth={2} name="API Calls" />
                    <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} name="Errors" />
                    <Line type="monotone" dataKey="featureUses" stroke="hsl(var(--secondary))" strokeWidth={2} name="Feature Uses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Error Triage Feed */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader 
            className="pb-2 cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'triage' ? null : 'triage')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Live Error Triage ({recentErrors.length})
              </CardTitle>
              {expandedSection === 'triage' ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'triage' && (
            <CardContent>
              <div className="space-y-3">
                {recentErrors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No recent errors 🎉
                  </p>
                ) : (
                  recentErrors.map((err) => {
                    // Session snapshot: last 5 events by same user
                    const userEvents = events
                      .filter(e => e.user_id === err.user_id && e.created_at <= err.created_at)
                      .slice(0, 5);

                    return (
                      <div key={err.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{err.event_name}</p>
                            <p className="text-xs text-destructive">{err.error_message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(err.created_at), 'MMM d HH:mm')}
                          </span>
                        </div>
                        {err.duration_ms && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {err.duration_ms}ms
                          </p>
                        )}
                        {/* Session Snapshot */}
                        {userEvents.length > 1 && (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                              <History className="w-3 h-3" /> Session Snapshot
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {userEvents.map((ue, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] py-0 h-5">
                                  {ue.event_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Top Functions */}
        <Card className="border-border/50">
          <CardHeader 
            className="pb-2 cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'functions' ? null : 'functions')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display">Top Functions</CardTitle>
              {expandedSection === 'functions' ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === 'functions' && (
            <CardContent>
              <div className="space-y-3">
                {aggregated.slice(0, 10).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.count} calls</span>
                          {item.avgDuration > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.avgDuration}ms avg
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.errorCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.errorCount} errors
                      </Badge>
                    )}
                  </div>
                ))}
                {aggregated.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No function calls recorded
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Error Breakdown */}
        {Object.keys(errors).length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Error Breakdown
                </CardTitle>
                {expandedSection === 'errors' ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSection === 'errors' && (
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={Object.entries(errors).map(([name, count]) => ({ name, count }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120}
                        className="text-xs"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--destructive))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default OperatorDashboard;
