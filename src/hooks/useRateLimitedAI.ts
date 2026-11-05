import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface QueuedCall<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
}

const MAX_CALLS_PER_MINUTE = 15;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_RETRIES = 5;
const RETRY_DELAY = 8000;

// Cancel all queued calls
export const cancelAllCalls = () => {
  while (globalQueue.length > 0) {
    const call = globalQueue.shift();
    call?.reject(new Error('Cancelled by user'));
  }
  notifyListeners(false, '');
};

// Global state to track API calls across all hook instances
let callTimestamps: number[] = [];
let globalQueue: QueuedCall<any>[] = [];
let isProcessing = false;
let globalLoadingCount = 0;
let loadingListeners: Set<(loading: boolean, message: string) => void> = new Set();

const notifyListeners = (loading: boolean, message: string) => {
  loadingListeners.forEach(listener => listener(loading, message));
};

const cleanOldTimestamps = () => {
  const now = Date.now();
  callTimestamps = callTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
};

const canMakeCall = (): boolean => {
  cleanOldTimestamps();
  return callTimestamps.length < MAX_CALLS_PER_MINUTE;
};

const getWaitTime = (): number => {
  cleanOldTimestamps();
  if (callTimestamps.length === 0) return 0;
  const oldestCall = Math.min(...callTimestamps);
  const waitTime = RATE_LIMIT_WINDOW - (Date.now() - oldestCall);
  return Math.max(0, waitTime);
};

const processQueue = async () => {
  if (isProcessing || globalQueue.length === 0) return;
  
  isProcessing = true;
  
  while (globalQueue.length > 0) {
    const call = globalQueue[0];
    
    if (!canMakeCall()) {
      const waitTime = getWaitTime();
      notifyListeners(true, `High traffic—please wait ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      continue;
    }
    
    try {
      globalQueue.shift();
      callTimestamps.push(Date.now());
      notifyListeners(true, 'Chef is preparing...');
      
      const result = await call.execute();
      call.resolve(result);
    } catch (error: any) {
      // Check for rate limit error (429)
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate')) {
        if (call.retries < MAX_RETRIES) {
          call.retries++;
          globalQueue.unshift(call); // Put back at front of queue
          notifyListeners(true, `Rate limited. Retrying in ${RETRY_DELAY / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          call.reject(new Error('Max retries exceeded. Please try again later.'));
        }
      } else {
        call.reject(error);
      }
    }
  }
  
  isProcessing = false;
  notifyListeners(false, '');
};

export function useRateLimitedAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const listener = (loading: boolean, message: string) => {
      setIsLoading(loading);
      setStatusMessage(message);
    };
    
    loadingListeners.add(listener);
    return () => {
      loadingListeners.delete(listener);
    };
  }, []);

  const queueCall = useCallback(<T>(
    execute: () => Promise<T>,
    callId?: string
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const call: QueuedCall<T> = {
        id: callId || `call-${Date.now()}-${Math.random()}`,
        execute,
        resolve,
        reject,
        retries: 0,
      };
      
      globalQueue.push(call);
      processQueue();
    });
  }, []);

  const getQueuePosition = useCallback((callId: string): number => {
    return globalQueue.findIndex(c => c.id === callId);
  }, []);

  const cancelCall = useCallback((callId: string) => {
    const index = globalQueue.findIndex(c => c.id === callId);
    if (index > -1) {
      const [removed] = globalQueue.splice(index, 1);
      removed.reject(new Error('Call cancelled'));
    }
  }, []);

  return {
    queueCall,
    isLoading,
    statusMessage,
    getQueuePosition,
    cancelCall,
    pendingCalls: globalQueue.length,
  };
}

// Global loading overlay component helper
export function useAILoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const listener = (loading: boolean, message: string) => {
      setIsLoading(loading);
      setStatusMessage(message);
    };
    
    loadingListeners.add(listener);
    return () => {
      loadingListeners.delete(listener);
    };
  }, []);

  return { isLoading, statusMessage };
}
