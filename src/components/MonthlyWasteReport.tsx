import React from 'react';
import { Trash2, TrendingDown, AlertCircle, BarChart3, Package, Leaf, Milk, Beef, Croissant, Snowflake, Coffee, Cookie, Lightbulb } from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  'Produce': Leaf,
  'Meat': Beef,
  'Dairy': Milk,
  'Bakery': Croissant,
  'Frozen': Snowflake,
  'Beverages': Coffee,
  'Snacks': Cookie,
  'Pantry': Package,
  'Other': Package,
};

const MonthlyWasteReport: React.FC = () => {
  const { wasteData } = useHousehold();

  const {
    totalWasted = 0,
    itemsWasted = 0,
    monthStart,
    monthEnd,
    wasteByCategory = {},
    topWastedItems = [],
  } = wasteData || {};

  // Format month range
  const monthRange = monthStart && monthEnd 
    ? format(new Date(monthStart), 'MMMM yyyy')
    : format(new Date(), 'MMMM yyyy');

  // Sort categories by value
  const sortedCategories = Object.entries(wasteByCategory)
    .sort(([, a], [, b]) => b.value - a.value)
    .slice(0, 4);

  // Calculate max for progress bars
  const maxCategoryValue = Math.max(...sortedCategories.map(([, data]) => data.value), 1);

  if (itemsWasted === 0) {
    return (
      <div className="bg-card rounded-3xl p-6 border border-border shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Waste Report</h2>
            <p className="text-xs text-muted-foreground">{monthRange}</p>
          </div>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <TrendingDown className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Zero Waste!</p>
          <p className="text-xs text-muted-foreground mt-1">No items thrown away this month</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 border border-border shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Waste Report</h2>
          <p className="text-xs text-muted-foreground">{monthRange}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-destructive/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-destructive/70" />
            <span className="text-xs text-muted-foreground">Value Lost</span>
          </div>
          <p className="text-xl font-bold text-destructive">${totalWasted.toFixed(2)}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Items Wasted</span>
          </div>
          <p className="text-xl font-bold text-foreground">{itemsWasted}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {sortedCategories.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">By Category</p>
          <div className="space-y-2">
            {sortedCategories.map(([category, data]) => {
              const Icon = categoryIcons[category] || Package;
              return (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{category}</span>
                      <span className="text-muted-foreground">${data.value.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-destructive/60 rounded-full transition-all"
                        style={{ width: `${(data.value / maxCategoryValue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Wasted Items */}
      {topWastedItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Most Wasted</p>
          <div className="flex flex-wrap gap-1.5">
            {topWastedItems.slice(0, 3).map((item, idx) => (
              <span 
                key={idx}
                className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  idx === 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                )}
              >
                {item.name} ({item.count})
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default MonthlyWasteReport;
