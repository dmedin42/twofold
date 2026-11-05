import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface OperatorEventRow {
  id: string;
  event_type: string;
  event_name: string;
  user_id: string | null;
  household_id: string | null;
  metadata: Record<string, any>;
  error_message: string | null;
  status_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AggregatedEvent {
  name: string;
  count: number;
  errorCount: number;
  avgDuration: number;
  lastOccurred: string;
}

export interface DailyStats {
  date: string;
  apiCalls: number;
  errors: number;
  featureUses: number;
}

export function useOperatorEvents(dateRange: { start: Date; end: Date }) {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<OperatorEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!user) return false;
    
    try {
      const { data, error } = await (supabase as any)
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  }, [user]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // First check admin status
      const adminStatus = await checkAdminStatus();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('Access denied. Admin privileges required.');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await (supabase as any)
        .from('operator_events')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching operator events:', err);
      setError(err.message || 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [user, dateRange, checkAdminStatus]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('operator-events-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operator_events' }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, fetchEvents]);

  // Aggregate events by name
  const aggregatedByName = useCallback((): AggregatedEvent[] => {
    const map = new Map<string, {
      count: number;
      errorCount: number;
      totalDuration: number;
      durationCount: number;
      lastOccurred: string;
    }>();

    events.forEach(event => {
      const existing = map.get(event.event_name) || {
        count: 0,
        errorCount: 0,
        totalDuration: 0,
        durationCount: 0,
        lastOccurred: event.created_at,
      };

      existing.count++;
      if (event.event_type === 'api_error') {
        existing.errorCount++;
      }
      if (event.duration_ms) {
        existing.totalDuration += event.duration_ms;
        existing.durationCount++;
      }
      if (event.created_at > existing.lastOccurred) {
        existing.lastOccurred = event.created_at;
      }

      map.set(event.event_name, existing);
    });

    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        errorCount: stats.errorCount,
        avgDuration: stats.durationCount > 0 
          ? Math.round(stats.totalDuration / stats.durationCount) 
          : 0,
        lastOccurred: stats.lastOccurred,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Get daily statistics
  const dailyStats = useCallback((): DailyStats[] => {
    const map = new Map<string, DailyStats>();

    events.forEach(event => {
      const date = event.created_at.split('T')[0];
      const existing = map.get(date) || {
        date,
        apiCalls: 0,
        errors: 0,
        featureUses: 0,
      };

      if (event.event_type === 'api_call') {
        existing.apiCalls++;
      } else if (event.event_type === 'api_error') {
        existing.errors++;
      } else if (event.event_type === 'feature_use') {
        existing.featureUses++;
      }

      map.set(date, existing);
    });

    return Array.from(map.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }, [events]);

  // Get error breakdown
  const errorBreakdown = useCallback(() => {
    return events
      .filter(e => e.event_type === 'api_error')
      .reduce((acc, event) => {
        const key = event.event_name;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }, [events]);

  // Summary stats
  const summary = {
    totalEvents: events.length,
    totalApiCalls: events.filter(e => e.event_type === 'api_call').length,
    totalErrors: events.filter(e => e.event_type === 'api_error').length,
    totalFeatureUses: events.filter(e => e.event_type === 'feature_use').length,
    errorRate: events.length > 0 
      ? (events.filter(e => e.event_type === 'api_error').length / events.length * 100).toFixed(1)
      : '0',
  };

  return {
    events,
    isLoading,
    error,
    isAdmin,
    summary,
    aggregatedByName,
    dailyStats,
    errorBreakdown,
    refetch: fetchEvents,
  };
}
