import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import Navigation from "@/components/Navigation";
import { Camera, ClipboardCheck, Package, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PredictiveGrid from "@/components/PredictiveGrid";
import BulkImportReview from "@/components/BulkImportReview";
import CameraScanner from "@/components/CameraScanner";
import ChefLoadingSpinner from "@/components/ChefLoadingSpinner";

type CheckInView = 'grid' | 'camera' | 'processing' | 'review';

export interface ImportedItem {
  id: string; name: string; category: string; qty: number; unit: string; shelf_life: number; selected: boolean; isFrozen?: boolean;
}

const PENDING_SCAN_KEY = 'twofold_pending_scan_task';

const CheckIn: React.FC = () => {
  const { activeUser } = useHousehold();
  const { startTask, cancelTask, activeTask, getTask, clearTask } = useBackgroundTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<CheckInView>('grid');
  const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
  const currentTaskIdRef = useRef<string | null>(null);

  // Map task result items to ImportedItem format
  const mapTaskResultToItems = (items: any[]): ImportedItem[] => {
    return items.map((item: any, index: number) => ({
      id: `scan-${Date.now()}-${index}`,
      name: item.name,
      category: item.category || 'Pantry',
      qty: item.qty || 1,
      unit: item.unit || 'count',
      shelf_life: item.shelf_life || 7,
      selected: true
    }));
  };

  // Handle deep link from URL query param (when clicking notification)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      const task = getTask(taskId);
      if (task?.status === 'completed' && task.result?.items) {
        setImportedItems(mapTaskResultToItems(task.result.items));
        setView('review');
        setSearchParams({});
        clearTask(taskId);
        localStorage.removeItem(PENDING_SCAN_KEY);
      } else if (task?.status === 'failed') {
        toast.error("Scan failed", { description: task.error });
        setSearchParams({});
        clearTask(taskId);
        localStorage.removeItem(PENDING_SCAN_KEY);
      }
    }
  }, [searchParams, getTask, clearTask, setSearchParams]);

  // Check for pending scan task from localStorage (when returning to page normally)
  useEffect(() => {
    const pendingTaskId = localStorage.getItem(PENDING_SCAN_KEY);
    if (pendingTaskId && !searchParams.get('taskId')) {
      const task = getTask(pendingTaskId);
      if (task?.status === 'completed' && task.result?.items) {
        setImportedItems(mapTaskResultToItems(task.result.items));
        setView('review');
        localStorage.removeItem(PENDING_SCAN_KEY);
        clearTask(pendingTaskId);
      } else if (task?.status === 'failed') {
        toast.error("Scan failed", { description: task.error });
        localStorage.removeItem(PENDING_SCAN_KEY);
        clearTask(pendingTaskId);
      } else if (task?.status === 'running') {
        // Task still running, show processing view
        currentTaskIdRef.current = pendingTaskId;
        setView('processing');
      }
    }
  }, [getTask, clearTask, searchParams]);

  // Check if we have a completed task to review (for active polling while on page)
  useEffect(() => {
    if (currentTaskIdRef.current) {
      const task = getTask(currentTaskIdRef.current);
      if (task?.status === 'completed' && task.result?.items) {
        setImportedItems(mapTaskResultToItems(task.result.items));
        setView('review');
        localStorage.removeItem(PENDING_SCAN_KEY);
        currentTaskIdRef.current = null;
      } else if (task?.status === 'failed') {
        toast.error("Scan failed", { description: task.error });
        setView('grid');
        localStorage.removeItem(PENDING_SCAN_KEY);
        currentTaskIdRef.current = null;
      }
    }
  }, [getTask, activeTask]);

  const handleCaptureAndProcess = async (imageBase64: string) => {
    setView('processing');
    
    // Use background task system for cancelable, persistent processing
    const taskId = startTask('scan', 'Scanning receipt...', async (signal) => {
      const response = await supabase.functions.invoke('process-vision', {
        body: { image: imageBase64 }
      });
      
      // Check if cancelled
      if (signal.aborted) {
        throw new DOMException('Cancelled', 'AbortError');
      }

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.items) throw new Error("No items found in receipt.");
      
      return response.data;
    });

    // Persist task ID so it survives navigation
    localStorage.setItem(PENDING_SCAN_KEY, taskId);
    currentTaskIdRef.current = taskId;
  };

  const handleCancelProcessing = () => {
    if (currentTaskIdRef.current) {
      cancelTask(currentTaskIdRef.current);
      localStorage.removeItem(PENDING_SCAN_KEY);
      currentTaskIdRef.current = null;
    }
    setView('grid');
    toast.info("Scan cancelled");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      <main className="container px-4 py-4 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
            <div><h1 className="font-display text-2xl font-bold">Check In</h1><p className="text-muted-foreground text-sm">Add items to your pantry</p></div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><ClipboardCheck className="text-primary w-5 h-5"/></div>
        </div>

        {view === 'grid' && (
          <>
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white mb-6 shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg"><Sparkles className="w-6 h-6"/></div>
                        <h2 className="font-bold text-lg">AI Receipt Scan</h2>
                    </div>
                    <p className="text-primary-foreground/90 text-sm mb-4">Snap a photo of your receipt. We'll extract items automatically.</p>
                    <Button onClick={() => setView('camera')} variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 border-0">
                        <Camera className="w-4 h-4 mr-2"/> Open Camera
                    </Button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"/>
            </div>
            <PredictiveGrid />
          </>
        )}

        {view === 'camera' && (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="font-bold">Scan Receipt</h2>
                    <Button variant="ghost" size="sm" onClick={() => setView('grid')}>Close</Button>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">
                    <CameraScanner onCapture={handleCaptureAndProcess} onCancel={() => setView('grid')} captureLabel="Scan Receipt"/>
                </div>
            </div>
        )}

        {view === 'processing' && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <ChefLoadingSpinner size="lg"/>
                <p className="text-muted-foreground animate-pulse">Analyzing receipt...</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelProcessing}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  You can navigate away - we'll keep processing in the background.
                </p>
            </div>
        )}

        {view === 'review' && (
            <BulkImportReview items={importedItems} setItems={setImportedItems} onBack={() => setView('grid')} onComplete={() => {
              window.dispatchEvent(new CustomEvent('chef-milestone', { detail: { type: 'scan' } }));
              setView('grid');
            }}/>
        )}
      </main>
    </div>
  );
};

export default CheckIn;
