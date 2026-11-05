import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { getExpiryStatus, getDaysUntilExpiry } from '@/data/expiryUtils';
import { AlertTriangle, XCircle, Clock, Package, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ExpiryAlerts: React.FC = () => {
  const { inventory, removeInventoryItem } = useHousehold();

  const handleRemove = (id: string, name: string) => {
    removeInventoryItem(id);
    toast.success(`${name} removed from pantry`);
  };

  // Empty state when no inventory
  if (inventory.length === 0) {
    return (
      <div className="bg-card rounded-3xl border border-border p-6 shadow-soft">
        <h3 className="font-display font-semibold text-lg text-foreground mb-4">
          Expiry Alerts
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">No inventory items yet</p>
          <Link to="/scan">
            <Button variant="outline" size="sm" className="rounded-xl">
              Add items via receipt
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const alertItems = inventory
    .map(item => ({
      ...item,
      status: getExpiryStatus(item.expiryDate),
      daysLeft: getDaysUntilExpiry(item.expiryDate),
    }))
    .filter(item => item.status !== 'fresh')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);

  if (alertItems.length === 0) {
    return (
      <div className="bg-card rounded-3xl border border-border p-6 shadow-soft">
        <h3 className="font-display font-semibold text-lg text-foreground mb-4">
          Expiry Alerts
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-accent-foreground" />
          </div>
          <p className="text-muted-foreground">All items are fresh!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-border p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Expiry Alerts
        </h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
          {alertItems.length} items
        </span>
      </div>

      <div className="space-y-2">
        {alertItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl group",
              item.status === 'expired' ? "bg-destructive/10" : "bg-secondary/30"
            )}
          >
            {item.status === 'expired' ? (
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-secondary flex-shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {item.name}
            </span>
            <span 
              className={cn(
                "text-xs font-medium",
                item.status === 'expired' ? "text-destructive" : "text-secondary"
              )}
            >
              {item.status === 'expired' 
                ? 'Expired' 
                : `${item.daysLeft}d left`
              }
            </span>
            <button
              onClick={() => handleRemove(item.id, item.name)}
              className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
              title="Remove item"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpiryAlerts;
