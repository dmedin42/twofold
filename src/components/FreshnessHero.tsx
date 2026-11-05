import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getExpiryStatus, getDaysUntilExpiry } from '@/data/expiryUtils';
import { AlertTriangle, Leaf, Package, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FreshnessHero: React.FC = () => {
  const { inventory, removeInventoryItem } = useHousehold();
  const navigate = useNavigate();

  const handleRemove = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Stop the click from triggering the row navigation
    removeInventoryItem(id);
    toast.success(`${name} removed from pantry`);
  };

  const handleItemClick = (itemId: string) => {
    navigate('/inventory', { state: { highlightId: itemId } });
  };

  // Get items sorted by urgency - filter out items with quantity <= 0 (marked as "gone")
  const perishableItems = inventory
    .filter(item => item.quantity > 0)
    .map(item => ({
      ...item,
      status: getExpiryStatus(item.expiryDate),
      daysLeft: getDaysUntilExpiry(item.expiryDate),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const urgentItems = perishableItems.filter(item => item.status !== 'fresh');
  const freshCount = perishableItems.filter(item => item.status === 'fresh').length;
  const expiredCount = perishableItems.filter(item => item.status === 'expired').length;
  const warningCount = perishableItems.filter(item => item.status === 'warning').length;

  if (inventory.length === 0) {
    return (
      <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Fresh Start</h2>
            <p className="text-sm opacity-80">Your pantry awaits</p>
          </div>
        </div>
        <p className="text-sm opacity-90 mb-4">
          Scan your first receipt to track freshness and get AI recipe suggestions.
        </p>
        <Link to="/checkin">
          <Button variant="secondary" className="w-full rounded-xl bg-white/20 hover:bg-white/30 text-white border-0">
            Add your first items
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Freshness Overview */}
      <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Freshness Status</h2>
            <p className="text-sm opacity-80">{perishableItems.length} items tracked</p>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-2xl font-semibold">{freshCount}</p>
            <p className="text-xs opacity-80">Fresh</p>
          </div>
          <div className={cn(
            "rounded-xl p-3 text-center",
            warningCount > 0 ? "bg-secondary/80" : "bg-white/15"
          )}>
            <p className="text-2xl font-semibold">{warningCount}</p>
            <p className="text-xs opacity-80">Use Soon</p>
          </div>
          <div className={cn(
            "rounded-xl p-3 text-center",
            expiredCount > 0 ? "bg-destructive/80" : "bg-white/15"
          )}>
            <p className="text-2xl font-semibold">{expiredCount}</p>
            <p className="text-xs opacity-80">Expired</p>
          </div>
        </div>
      </div>

      {/* Urgent Items List */}
      {urgentItems.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-soft">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-secondary" />
            Use These First
          </h3>
          <div className="space-y-2">
            {urgentItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item.id)} // <--- Added Navigation Back
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl group cursor-pointer transition-all hover:bg-muted/50",
                  item.status === 'expired' ? "bg-destructive/5" : "bg-secondary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    item.status === 'expired' ? "bg-destructive" : "bg-secondary"
                  )} />
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-none">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap",
                    item.status === 'expired' 
                      ? "bg-destructive/20 text-destructive" 
                      : "bg-secondary/20 text-secondary"
                  )}>
                    {item.status === 'expired' ? 'Expired' : `${item.daysLeft}d left`}
                  </span>
                  
                  {/* Quick Delete Button */}
                  <button
                    onClick={(e) => handleRemove(e, item.id, item.name)}
                    className="p-1.5 rounded-lg bg-background border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FreshnessHero;