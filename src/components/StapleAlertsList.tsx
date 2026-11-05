import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { categorizeForStapleAlerts, StapleAlertItem, generateStapleMealPrompt, shouldShowMealSuggestion } from '@/lib/staplePromptGenerator';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Lightbulb, AlertTriangle, Clock, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const StapleAlertsList: React.FC = () => {
  const { inventory, getExpiringStaples, getGoneStaples } = useHousehold();
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);
  
  const alertItems = categorizeForStapleAlerts(inventory);
  const expiringStaples = getExpiringStaples(2);
  const goneStaples = getGoneStaples();
  
  const showMealPrompt = shouldShowMealSuggestion(expiringStaples);
  
  const handleCopyMealPrompt = async () => {
    const prompt = generateStapleMealPrompt(expiringStaples, goneStaples);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      toast.success('Meal suggestion prompt copied!', {
        description: 'Paste it into ChatGPT or Claude to get personalized recipes'
      });
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      toast.error('Failed to copy prompt');
    }
  };

  // Filter to show only items with alerts or expiring soon
  const urgentItems = alertItems.filter(
    a => a.status === 'gone' || a.status === 'expiring'
  );

  if (urgentItems.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Check className="w-8 h-8 mx-auto mb-2 text-primary" />
        <p className="text-sm">All staples are stocked and fresh!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meal Suggestion Banner */}
      {showMealPrompt && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {expiringStaples.length} staples expiring soon!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get AI meal suggestions to use them up before they expire.
              </p>
              <Button 
                onClick={handleCopyMealPrompt}
                size="sm"
                className="mt-3 gap-2"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Meal Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Items List */}
      <div className="space-y-2">
        {urgentItems.map((alertItem) => (
          <StapleAlertRow key={alertItem.item.id} alertItem={alertItem} />
        ))}
      </div>
    </div>
  );
};

const StapleAlertRow: React.FC<{ alertItem: StapleAlertItem }> = ({ alertItem }) => {
  const { item, status, alertType, daysUntilExpiry } = alertItem;

  const statusConfig = {
    gone: {
      bg: 'bg-destructive/10 border-destructive/30',
      icon: ShoppingCart,
      iconColor: 'text-destructive',
      label: 'GONE',
      labelColor: 'text-destructive',
    },
    expiring: {
      bg: 'bg-warning/10 border-warning/30',
      icon: Clock,
      iconColor: 'text-warning',
      label: `${daysUntilExpiry}d left`,
      labelColor: 'text-warning',
    },
    ok: {
      bg: 'bg-muted border-border',
      icon: Check,
      iconColor: 'text-muted-foreground',
      label: 'OK',
      labelColor: 'text-muted-foreground',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      config.bg
    )}>
      <Icon className={cn("w-5 h-5 shrink-0", config.iconColor)} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{item.name}</span>
          {item.isFrequentStaple && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              Staple
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {item.category} • {item.quantity} {item.unit}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs font-medium", config.labelColor)}>
          {config.label}
        </span>
        
        {alertType === 'auto_grocery' && (
          <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
            <ShoppingCart className="w-3 h-3" />
            <span>Auto-added</span>
          </div>
        )}
        
        {alertType === 'meal_suggestion' && (
          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Lightbulb className="w-3 h-3" />
            <span>Use it!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StapleAlertsList;
