import React from 'react';
import { Trophy, Award, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImpactBadgesProps {
  itemsRescued: number;
  totalSavings: number;
}

const BADGE_TIERS = [
  { key: 'champion', label: 'Sustainability Champion', icon: Trophy, threshold: { savings: 100 }, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'hero', label: 'Kitchen Hero', icon: Award, threshold: { rescued: 50 }, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'warrior', label: 'Waste Warrior', icon: Leaf, threshold: { rescued: 10 }, color: 'text-green-600', bg: 'bg-green-500/10' },
];

const ImpactBadges: React.FC<ImpactBadgesProps> = ({ itemsRescued, totalSavings }) => {
  // Find highest earned badge
  const earnedBadge = BADGE_TIERS.find(badge => {
    if ('savings' in badge.threshold && totalSavings >= badge.threshold.savings) return true;
    if ('rescued' in badge.threshold && itemsRescued >= badge.threshold.rescued) return true;
    return false;
  });

  // Find next badge to earn
  const nextBadge = [...BADGE_TIERS].reverse().find(badge => {
    if ('savings' in badge.threshold && totalSavings < badge.threshold.savings) return true;
    if ('rescued' in badge.threshold && itemsRescued < badge.threshold.rescued) return true;
    return false;
  });

  if (!earnedBadge && !nextBadge) return null;

  const BadgeIcon = earnedBadge?.icon || Leaf;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        earnedBadge ? earnedBadge.bg : "bg-muted"
      )}>
        <BadgeIcon className={cn("w-5 h-5", earnedBadge ? earnedBadge.color : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        {earnedBadge ? (
          <>
            <p className="text-sm font-semibold text-primary-foreground">{earnedBadge.label}</p>
            <p className="text-xs text-primary-foreground/60">
              {itemsRescued} items rescued · ${totalSavings.toFixed(0)} saved
            </p>
          </>
        ) : nextBadge ? (
          <>
            <p className="text-sm font-medium text-primary-foreground/80">Next: {nextBadge.label}</p>
            <p className="text-xs text-primary-foreground/60">
              {'rescued' in nextBadge.threshold
                ? `${nextBadge.threshold.rescued - itemsRescued} more items to go`
                : `$${(nextBadge.threshold.savings! - totalSavings).toFixed(0)} more to save`
              }
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ImpactBadges;
