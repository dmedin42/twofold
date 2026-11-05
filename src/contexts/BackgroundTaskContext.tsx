import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask {
  id: string;
  type: 'recipe' | 'scan' | 'ai';
  status: TaskStatus;
  title: string;
  startedAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

interface BackgroundTaskContextType {
  tasks: BackgroundTask[];
  activeTask: BackgroundTask | null;
  startTask: (type: BackgroundTask['type'], title: string, executor: (signal: AbortSignal) => Promise<any>) => string;
  cancelTask: (id: string) => void;
  clearTask: (id: string) => void;
  getTask: (id: string) => BackgroundTask | undefined;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined);

const STORAGE_KEY = 'twofold_background_tasks';

export const BackgroundTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<BackgroundTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BackgroundTask[];
        // Reset any running tasks to failed (app was closed while running)
        return parsed.map(t => t.status === 'running' ? { ...t, status: 'failed' as TaskStatus, error: 'Task interrupted' } : t);
      }
    } catch {}
    return [];
  });
  
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Persist tasks to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const activeTask = tasks.find(t => t.status === 'running') || null;

  const startTask = useCallback((
    type: BackgroundTask['type'],
    title: string,
    executor: (signal: AbortSignal) => Promise<any>
  ): string => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    abortControllers.current.set(id, controller);

    const newTask: BackgroundTask = {
      id,
      type,
      status: 'running',
      title,
      startedAt: Date.now(),
    };

    setTasks(prev => [...prev.filter(t => t.status !== 'completed' || Date.now() - (t.completedAt || 0) < 300000), newTask]);

    // Execute in background
    executor(controller.signal)
      .then(result => {
        setTasks(prev => prev.map(t => 
          t.id === id ? { ...t, status: 'completed', completedAt: Date.now(), result } : t
        ));
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          setTasks(prev => prev.map(t => 
            t.id === id ? { ...t, status: 'cancelled', completedAt: Date.now() } : t
          ));
        } else {
          setTasks(prev => prev.map(t => 
            t.id === id ? { ...t, status: 'failed', completedAt: Date.now(), error: err.message } : t
          ));
        }
      })
      .finally(() => {
        abortControllers.current.delete(id);
      });

    return id;
  }, []);

  const cancelTask = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
  }, []);

  const clearTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTask = useCallback((id: string) => {
    return tasks.find(t => t.id === id);
  }, [tasks]);

  return (
    <BackgroundTaskContext.Provider value={{ tasks, activeTask, startTask, cancelTask, clearTask, getTask }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export const useBackgroundTasks = () => {
  const context = useContext(BackgroundTaskContext);
  if (!context) throw new Error('useBackgroundTasks must be used within BackgroundTaskProvider');
  return context;
};
