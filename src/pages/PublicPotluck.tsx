import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicPotluck } from '@/hooks/usePotlucks';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DishSignupBoard from '@/components/potluck/DishSignupBoard';
import RsvpSection from '@/components/potluck/RsvpSection';
import AISuggestions from '@/components/potluck/AISuggestions';
import GuestIdentityCard from '@/components/potluck/GuestIdentityCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UtensilsCrossed, Calendar, MapPin, Clock, Copy, 
  AlertCircle, Crown, Bookmark, BookmarkCheck, LogIn, Sparkles, ArrowLeft
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper to parse guest name with extra guests count
const parseGuestName = (fullName: string): { name: string; extraGuests: number } => {
  const match = fullName.match(/^(.+?)\s*\(\+(\d+)\)$/);
  if (match) {
    return { name: match[1].trim(), extraGuests: parseInt(match[2], 10) };
  }
  return { name: fullName, extraGuests: 0 };
};

// Helper to format guest name with extra guests
const formatGuestName = (name: string, extraGuests: number): string => {
  if (extraGuests > 0) {
    return `${name} (+${extraGuests})`;
  }
  return name;
};

const PublicPotluck: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { user } = useAuthContext();
  const { 
    potluck, isLoading, error, isSaved, refetch,
    claimItem, unclaimItem, updateItem, deleteItem, addGuestItem, rsvp,
    savePotluck, unsavePotluck
  } = usePublicPotluck(shareCode || null);
  
  const [guestName, setGuestName] = useState('');
  const [extraGuests, setExtraGuests] = useState(0);
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved guest identity from localStorage
  useEffect(() => {
    if (shareCode) {
      const savedIdentity = localStorage.getItem(`potluck-guest-${shareCode}`);
      if (savedIdentity) {
        const { name, extraGuests: savedExtra } = JSON.parse(savedIdentity);
        setGuestName(name);
        setExtraGuests(savedExtra || 0);
        setIsLockedIn(true);
      }
    }
  }, [shareCode]);

  const handleLockIn = () => {
    if (guestName.trim()) {
      setIsLockedIn(true);
      // Save to localStorage for persistence
      if (shareCode) {
        localStorage.setItem(`potluck-guest-${shareCode}`, JSON.stringify({
          name: guestName.trim(),
          extraGuests,
        }));
      }
    }
  };

  const handleEditName = () => {
    setIsLockedIn(false);
  };

  // Get the full guest name for RSVP/claims (with +X if applicable)
  const fullGuestName = formatGuestName(guestName.trim(), extraGuests);

  // Check if current user is the host
  const isHost = user && potluck && potluck.owner_id === user.id;
  // Check if it's the user's own household potluck
  const isOwnHousehold = user && potluck && potluck.household_id;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/potluck/${shareCode}`);
    toast.success('Link copied!');
  };

  const handleAddNeededItem = async (data: { item_name: string; category: string; notes?: string }) => {
    if (!potluck) return;
    try {
      const { error } = await (supabase as any)
        .from('potluck_items')
        .insert({
          potluck_id: potluck.id,
          item_name: data.item_name,
          category: data.category,
          notes: data.notes || null,
          is_needed: true,
          claimed_by_user_id: user?.id,
        });

      if (error) throw error;
      toast.success('Item added!');
      refetch();
    } catch (err) {
      console.error('Error adding needed item:', err);
      toast.error('Failed to add item');
    }
  };

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!potluck || !guestName.trim()) return;
    await rsvp(potluck.id, guestName.trim(), status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-lg mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !potluck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Potluck Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'This potluck may be private or the link is invalid.'}
          </p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">
              Go to Twofold Kitchen
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(potluck.event_date);
  const isPastEvent = isPast(eventDate) && !isToday(eventDate);

  // Format time if available
  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {isHost && (
              <Link to="/potlucks">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Potluck Protocol
              </span>
              <h1 className="font-display text-lg font-semibold text-foreground leading-tight">
                {potluck.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isHost && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                  <Crown className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Host</span>
                </div>
              )}
              {isSaved && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                  <BookmarkCheck className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Saved</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Event Info Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className={cn(isPastEvent && 'line-through')}>
                  {format(eventDate, 'EEEE, MMMM d, yyyy')}
                </span>
                {isPastEvent && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Past</span>
                )}
              </div>
              {potluck.event_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(potluck.event_time)}</span>
                </div>
              )}
              {potluck.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{potluck.location}</span>
                </div>
              )}
            </div>
            {potluck.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {potluck.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Guest Identity Card */}
        {!isPastEvent && !isHost && (
          <GuestIdentityCard
            guestName={guestName}
            extraGuests={extraGuests}
            isLockedIn={isLockedIn}
            onNameChange={setGuestName}
            onExtraGuestsChange={setExtraGuests}
            onLockIn={handleLockIn}
            onEdit={handleEditName}
            disabled={isPastEvent}
          />
        )}

        {/* Tabs: Dishes, Guests, AI (for hosts) */}
        <Tabs defaultValue="dishes" className="w-full">
          <TabsList className={cn(
            "grid w-full rounded-xl bg-muted/50",
            isHost && !isPastEvent ? "grid-cols-3" : "grid-cols-2"
          )}>
            <TabsTrigger value="dishes" className="rounded-lg">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Dishes
            </TabsTrigger>
            <TabsTrigger value="guests" className="rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              Guests
            </TabsTrigger>
            {isHost && !isPastEvent && (
              <TabsTrigger value="ai" className="rounded-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Ideas
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dishes" className="mt-4">
            <DishSignupBoard
              items={potluck.items}
              categoryLimits={potluck.category_limits}
              guestName={isHost ? 'Host' : fullGuestName}
              isHost={isHost || false}
              isPastEvent={isPastEvent}
              onClaim={(itemId) => claimItem(itemId, fullGuestName)}
              onUnclaim={unclaimItem}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onAddDish={(data) => addGuestItem(potluck.id, data)}
              onAddNeededItem={handleAddNeededItem}
            />
          </TabsContent>

          <TabsContent value="guests" className="mt-4">
            <RsvpSection
              rsvps={potluck.rsvps || []}
              guestName={fullGuestName}
              onRsvp={handleRsvp}
              disabled={!isLockedIn || isPastEvent}
            />
          </TabsContent>

          {isHost && !isPastEvent && (
            <TabsContent value="ai" className="mt-4">
              <AISuggestions
                potluckTitle={potluck.title}
                potluckDescription={potluck.description}
                currentItems={potluck.items.map(i => i.item_name)}
                onAddItem={handleAddNeededItem}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Save to Dashboard - for logged-in users who don't own this potluck */}
        {user && !isHost && !isSaved && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Save to your dashboard</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep track of this potluck from your Potlucks page
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="rounded-xl"
                  onClick={async () => {
                    setIsSaving(true);
                    await savePotluck();
                    setIsSaving(false);
                  }}
                  disabled={isSaving}
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already saved indicator with unsave option */}
        {user && !isHost && isSaved && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Saved to your dashboard</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={unsavePotluck}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA for non-users */}
        {!user && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 mt-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Have an account?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sign in to save this potluck to your dashboard
                  </p>
                </div>
                <Link to="/auth">
                  <Button size="sm" variant="outline" className="rounded-xl">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PublicPotluck;
