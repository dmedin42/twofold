import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePotlucks } from '@/hooks/usePotlucks';
import Navigation from '@/components/Navigation';
import CreatePotluckDialog from '@/components/potluck/CreatePotluckDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UtensilsCrossed, Plus, Calendar, MapPin, Users, 
  Clock, Trash2, Copy, Bookmark, ExternalLink 
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Potlucks: React.FC = () => {
  const { potlucks, savedPotlucks, isLoading, deletePotluck, unsavePotluck } = usePotlucks();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [unsaveId, setUnsaveId] = useState<string | null>(null);

  const handleCopyLink = (shareCode: string) => {
    const url = `${window.location.origin}/potluck/${shareCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePotluck(deleteId);
      setDeleteId(null);
    }
  };

  const handleUnsave = async () => {
    if (unsaveId) {
      await unsavePotluck(unsaveId);
      setUnsaveId(null);
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const upcomingPotlucks = potlucks.filter(p => !isPast(new Date(p.event_date)) || isToday(new Date(p.event_date)));
  const pastPotlucks = potlucks.filter(p => isPast(new Date(p.event_date)) && !isToday(new Date(p.event_date)));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navigation />

      <main className="container px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Potluck Protocol</h1>
              <p className="text-sm text-muted-foreground">Plan together, feast together</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="rounded-xl h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : potlucks.length === 0 ? (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No Potlucks Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first potluck to start planning with friends
              </p>
              <Button onClick={() => setShowCreate(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Initialize a Potluck
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming */}
            {upcomingPotlucks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground px-1">Upcoming</h2>
                {upcomingPotlucks.map(potluck => {
                  const claimedCount = potluck.items.filter(i => !i.is_needed).length;
                  const totalItems = potluck.items.length;

                  return (
                    <Card key={potluck.id} className="border-border/50 bg-card/50 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <Link 
                            to={`/potluck/${potluck.share_code}`} 
                            className="flex-1 min-w-0 group"
                          >
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {potluck.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatEventDate(potluck.event_date)}
                              </span>
                              {potluck.event_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {potluck.event_time}
                                </span>
                              )}
                              {potluck.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {potluck.location}
                                </span>
                              )}
                              {totalItems > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {claimedCount}/{totalItems} claimed
                                </span>
                              )}
                            </div>
                          </Link>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleCopyLink(potluck.share_code)}
                              title="Copy share link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(potluck.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Saved Potlucks */}
            {savedPotlucks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-primary" />
                  Saved
                </h2>
                {savedPotlucks.map(potluck => {
                  const claimedCount = potluck.items.filter(i => !i.is_needed).length;
                  const totalItems = potluck.items.length;

                  return (
                    <Card key={potluck.id} className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <Link 
                            to={`/potluck/${potluck.share_code}`} 
                            className="flex-1 min-w-0 group"
                          >
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {potluck.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatEventDate(potluck.event_date)}
                              </span>
                              {potluck.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {potluck.location}
                                </span>
                              )}
                              {totalItems > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {claimedCount}/{totalItems} claimed
                                </span>
                              )}
                            </div>
                          </Link>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleCopyLink(potluck.share_code)}
                              title="Copy share link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => setUnsaveId(potluck.id)}
                              title="Remove from saved"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Past */}
            {pastPotlucks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground px-1">Past</h2>
                {pastPotlucks.map(potluck => (
                  <Card key={potluck.id} className="border-border/50 bg-muted/30 opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{potluck.title}</h3>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(potluck.event_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(potluck.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <CreatePotluckDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Potluck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this potluck and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsave Confirmation */}
      <AlertDialog open={!!unsaveId} onOpenChange={() => setUnsaveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Saved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the potluck from your dashboard. You can always save it again from the potluck link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnsave}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Potlucks;
