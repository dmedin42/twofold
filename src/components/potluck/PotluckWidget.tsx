import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePotlucks } from '@/hooks/usePotlucks';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UtensilsCrossed, Plus, Users, Calendar, ChevronRight } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import CreatePotluckDialog from './CreatePotluckDialog';
import { cn } from '@/lib/utils';

const PotluckWidget: React.FC = () => {
  const { potlucks, isLoading } = usePotlucks();
  const { preferences } = useDashboardPreferences();
  const [showCreate, setShowCreate] = useState(false);

  // Only show if enabled in preferences
  if (!preferences.showPotlucks) return null;

  // Get upcoming potlucks (not past)
  const upcomingPotlucks = potlucks
    .filter(p => !isPast(new Date(p.event_date)) || isToday(new Date(p.event_date)))
    .slice(0, 2);

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-card to-accent/5 overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Potluck Protocol</h3>
                <p className="text-xs text-muted-foreground">Plan together, feast together</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-5 h-5 text-primary" />
            </Button>
          </div>

          {/* Content */}
          {upcomingPotlucks.length === 0 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Initialize a Potluck</span>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {upcomingPotlucks.map(potluck => {
                const claimedCount = potluck.items.filter(i => !i.is_needed).length;
                const totalItems = potluck.items.length;

                return (
                  <Link
                    key={potluck.id}
                    to={`/potluck/${potluck.share_code}`}
                    className="block p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {potluck.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatEventDate(potluck.event_date)}
                          </span>
                          {totalItems > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {claimedCount}/{totalItems} claimed
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                );
              })}

              {potlucks.length > 2 && (
                <Link
                  to="/potlucks"
                  className="block text-center text-xs text-muted-foreground hover:text-primary py-2 transition-colors"
                >
                  View all {potlucks.length} potlucks →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePotluckDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
};

export default PotluckWidget;
