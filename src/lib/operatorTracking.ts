import { supabase } from '@/integrations/supabase/client';

export type EventType = 'api_call' | 'api_error' | 'feature_use' | 'navigation' | 'user_action';

export interface OperatorEvent {
  type: EventType;
  name: string;
  metadata?: Record<string, any>;
  error?: string;
  statusCode?: number;
  durationMs?: number;
}

/**
 * Track an event for operator analytics.
 * This is a fire-and-forget function that doesn't block.
 */
export async function trackEvent(event: OperatorEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await (supabase as any).from('operator_events').insert({
      event_type: event.type,
      event_name: event.name,
      user_id: user?.id || null,
      metadata: event.metadata || {},
      error_message: event.error || null,
      status_code: event.statusCode || null,
      duration_ms: event.durationMs || null,
    });
  } catch (err) {
    // Silently fail - we don't want tracking to break the app
    console.debug('Operator tracking error:', err);
  }
}

/**
 * Create a timer for tracking API call duration.
 */
export function createTimer() {
  const startTime = Date.now();
  return {
    elapsed: () => Date.now() - startTime,
  };
}

/**
 * Track an API call with automatic duration measurement.
 */
export async function trackApiCall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = createTimer();
  
  try {
    const result = await fn();
    
    trackEvent({
      type: 'api_call',
      name,
      durationMs: timer.elapsed(),
      statusCode: 200,
    });
    
    return result;
  } catch (err: any) {
    trackEvent({
      type: 'api_error',
      name,
      durationMs: timer.elapsed(),
      error: err.message || 'Unknown error',
      statusCode: err.status || 500,
    });
    
    throw err;
  }
}

/**
 * Track a feature being used.
 */
export function trackFeatureUse(featureName: string, metadata?: Record<string, any>): void {
  trackEvent({
    type: 'feature_use',
    name: featureName,
    metadata,
  });
}

/**
 * Track navigation to a page.
 */
export function trackNavigation(pageName: string, metadata?: Record<string, any>): void {
  trackEvent({
    type: 'navigation',
    name: pageName,
    metadata,
  });
}

/**
 * Track a user action (button click, form submit, etc).
 */
export function trackUserAction(actionName: string, metadata?: Record<string, any>): void {
  trackEvent({
    type: 'user_action',
    name: actionName,
    metadata,
  });
}
