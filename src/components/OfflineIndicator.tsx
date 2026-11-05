import React from 'react';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  onSync?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  isOnline, 
  pendingCount,
  onSync 
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-full shadow-elevated",
        "flex items-center gap-2 text-sm font-medium",
        "animate-in slide-in-from-bottom-4 duration-300",
        isOnline 
          ? "bg-primary text-primary-foreground" 
          : "bg-destructive text-destructive-foreground"
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
          {onSync && (
            <button 
              onClick={onSync}
              className="ml-1 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs opacity-80">
              ({pendingCount} pending)
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
