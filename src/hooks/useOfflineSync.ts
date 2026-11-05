import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DB_NAME = 'TwofoldOfflineDB';
const DB_VERSION = 1;
const STORES = {
  INVENTORY: 'inventory_items',
  GROCERIES: 'grocery_list_items',
  RECIPES: 'recipes',
  PENDING_OPS: 'pending_operations',
};

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bumped version for recipes store

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
        db.createObjectStore(STORES.INVENTORY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.GROCERIES)) {
        db.createObjectStore(STORES.GROCERIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.RECIPES)) {
        db.createObjectStore(STORES.RECIPES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PENDING_OPS)) {
        db.createObjectStore(STORES.PENDING_OPS, { keyPath: 'id' });
      }
    };
  });
};

export const useOfflineSync = (householdId: string | null) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!', { description: 'Syncing changes...' });
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline', { description: 'Changes will sync when reconnected.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache data to IndexedDB
  const cacheData = useCallback(async (storeName: string, data: unknown[]) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing data
      store.clear();

      // Add new data
      (data as Array<{ id: string }>).forEach(item => {
        store.put(item);
      });

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, []);

  // Get cached data from IndexedDB
  const getCachedData = useCallback(async <T>(storeName: string): Promise<T[]> => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          db.close();
          resolve(request.result as T[]);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return [];
    }
  }, []);

  // Queue operation for offline sync
  const queueOperation = useCallback(async (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORES.PENDING_OPS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_OPS);

      const pendingOp: PendingOperation = {
        ...operation,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      store.add(pendingOp);

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      db.close();
      updatePendingCount();
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  }, []);

  // Sync pending operations when back online
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const db = await openDatabase();
      const tx = db.transaction(STORES.PENDING_OPS, 'readonly');
      const store = tx.objectStore(STORES.PENDING_OPS);
      const request = store.getAll();

      const operations = await new Promise<PendingOperation[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (operations.length === 0) return;

      let successCount = 0;

      for (const op of operations.sort((a, b) => a.timestamp - b.timestamp)) {
        try {
          // Use explicit table queries to satisfy TypeScript
          if (op.table === 'inventory_items') {
            if (op.operation === 'insert') {
              await (supabase as any).from('inventory_items').insert(op.data);
            } else if (op.operation === 'update') {
              const { id, ...rest } = op.data as { id: string };
              await (supabase as any).from('inventory_items').update(rest).eq('id', id);
            } else if (op.operation === 'delete') {
              await (supabase as any).from('inventory_items').delete().eq('id', op.data.id as string);
            }
          } else if (op.table === 'grocery_list_items') {
            if (op.operation === 'insert') {
              await (supabase as any).from('grocery_list_items').insert(op.data);
            } else if (op.operation === 'update') {
              const { id, ...rest } = op.data as { id: string };
              await (supabase as any).from('grocery_list_items').update(rest).eq('id', id);
            } else if (op.operation === 'delete') {
              await (supabase as any).from('grocery_list_items').delete().eq('id', op.data.id as string);
            }
          }

          // Remove successful operation
          const deleteDb = await openDatabase();
          const deleteTx = deleteDb.transaction(STORES.PENDING_OPS, 'readwrite');
          deleteTx.objectStore(STORES.PENDING_OPS).delete(op.id);
          deleteDb.close();

          successCount++;
        } catch (error) {
          console.error('Failed to sync operation:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline changes`);
      }

      updatePendingCount();
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
    }
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORES.PENDING_OPS, 'readonly');
      const store = tx.objectStore(STORES.PENDING_OPS);
      const request = store.count();

      request.onsuccess = () => {
        setPendingCount(request.result);
        db.close();
      };
    } catch (error) {
      console.error('Failed to count pending operations:', error);
    }
  }, []);

  // Initial sync check
  useEffect(() => {
    updatePendingCount();
    if (navigator.onLine) {
      syncPendingOperations();
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    cacheData,
    getCachedData,
    queueOperation,
    syncPendingOperations,
    STORES,
  };
};

export default useOfflineSync;
