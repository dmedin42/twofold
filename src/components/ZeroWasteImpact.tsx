import React from 'react';
import { Leaf, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format } from 'date-fns';
import ImpactBadges from '@/components/ImpactBadges';

// Simplified category value mapping (USD)
const CATEGORY_VALUES: Record<string, number> = {
  'Produce': 1.50,
  'Meat': 4.00,
  'Dairy': 2.50,
  'Bakery': 2.00,
  'Frozen': 3.00,
  'Beverages': 1.75,
  'Snacks': 1.50,
  'Condiments': 1.25,
  'Canned': 1.00,
  'Grains': 1.00,
  'Other': 1.00,
};

const ZeroWasteImpact: React.FC = () => {
  const { savingsData } = useHousehold();

  const {
    totalSavings = 0,
    itemsRescued = 0,
    weeklyItemsRescued = 0,
    weeklySavings = 0,
    weekStart,
    weekEnd
  } = savingsData || {};

  // Format week range
  const weekRange = weekStart && weekEnd 
    ? `${format(new Date(weekStart), 'MMM d')} - ${format(new Date(weekEnd), 'MMM d')}`
    : 'This Week';

  return (
    <div className="bg-gradient-to-br from-primary/90 to-primary rounded-3xl p-6 shadow-elevated text-primary-foreground">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Zero-Waste Impact</h2>
          <p className="text-xs text-primary-foreground/70">Your kitchen sustainability</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Weekly Impact */}
        <div className="bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary-foreground/80" />
            <span className="text-xs text-primary-foreground/70">{weekRange}</span>
          </div>
          <p className="text-2xl font-bold">${weeklySavings.toFixed(2)}</p>
          <p className="text-xs text-primary-foreground/60 mt-1">{weeklyItemsRescued} items saved</p>
        </div>

        {/* Total Impact */}
        <div className="bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary-foreground/80" />
            <span className="text-xs text-primary-foreground/70">All Time</span>
          </div>
          <p className="text-2xl font-bold">${totalSavings.toFixed(2)}</p>
          <p className="text-xs text-primary-foreground/60 mt-1">{itemsRescued} items rescued</p>
        </div>
      </div>

      {/* Impact Badge */}
      <ImpactBadges itemsRescued={itemsRescued} totalSavings={totalSavings} />

      <div className="bg-primary-foreground/10 rounded-xl p-3 flex items-center gap-3">
        <Package className="w-5 h-5 text-primary-foreground/70 shrink-0" />
        <p className="text-sm text-primary-foreground/90">
          Every item you use before it expires is money saved and waste prevented!
        </p>
      </div>
    </div>
  );
};

export { CATEGORY_VALUES };
export default ZeroWasteImpact;
