import React from 'react';
import { useAILoadingState, cancelAllCalls } from '@/hooks/useRateLimitedAI';
import { Loader2, X, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AILoadingOverlayProps {
  className?: string;
}

const AILoadingOverlay: React.FC<AILoadingOverlayProps> = ({ className }) => {
  const { isLoading, statusMessage } = useAILoadingState();

  if (!isLoading) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-20 md:bottom-4 right-4 z-50",
        "animate-in slide-in-from-right-4 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated bg-card border border-border">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ChefHat className="w-4 h-4 text-primary" />
        </div>
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Processing...</p>
          {statusMessage && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {statusMessage}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={cancelAllCalls}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AILoadingOverlay;
