import React from 'react';
import { PotluckRsvp, RsvpStatus } from '@/types/potluck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, HelpCircle, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RsvpSectionProps {
  rsvps: PotluckRsvp[];
  guestName: string;
  onRsvp: (status: RsvpStatus) => void;
  disabled?: boolean;
}

// Helper to parse guest name with extra guests count
const parseGuestName = (fullName: string): { name: string; extraGuests: number } => {
  const match = fullName.match(/^(.+?)\s*\(\+(\d+)\)$/);
  if (match) {
    return { name: match[1].trim(), extraGuests: parseInt(match[2], 10) };
  }
  return { name: fullName, extraGuests: 0 };
};

// Calculate total headcount including extra guests
const calculateHeadcount = (rsvps: PotluckRsvp[], status: RsvpStatus): number => {
  return rsvps
    .filter(r => r.status === status)
    .reduce((total, r) => {
      const { extraGuests } = parseGuestName(r.guest_name);
      return total + 1 + extraGuests;
    }, 0);
};

const RsvpSection: React.FC<RsvpSectionProps> = ({
  rsvps,
  guestName,
  onRsvp,
  disabled,
}) => {
  const { name: baseName } = parseGuestName(guestName);
  
  const currentRsvp = rsvps.find(r => {
    const { name: rsvpBaseName } = parseGuestName(r.guest_name);
    return rsvpBaseName.toLowerCase() === baseName.toLowerCase();
  });

  const goingCount = calculateHeadcount(rsvps, 'going');
  const maybeCount = calculateHeadcount(rsvps, 'maybe');
  const notGoingRsvps = rsvps.filter(r => r.status === 'not_going').length;

  const goingGuests = rsvps.filter(r => r.status === 'going');
  const maybeGuests = rsvps.filter(r => r.status === 'maybe');

  const renderGuestName = (guest: PotluckRsvp) => {
    const { name, extraGuests } = parseGuestName(guest.guest_name);
    return (
      <span key={guest.id} className="inline-flex items-center gap-1">
        {name}
        {extraGuests > 0 && (
          <span className="text-xs text-primary font-medium">(+{extraGuests})</span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* RSVP Buttons */}
      {guestName && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your RSVP</label>
          <div className="flex gap-2">
            <Button
              variant={currentRsvp?.status === 'going' ? 'default' : 'outline'}
              className={cn(
                "flex-1 rounded-xl h-10",
                currentRsvp?.status === 'going' && "bg-primary"
              )}
              onClick={() => onRsvp('going')}
              disabled={disabled}
            >
              <Check className="w-4 h-4 mr-2" />
              Going
            </Button>
            <Button
              variant={currentRsvp?.status === 'maybe' ? 'default' : 'outline'}
              className={cn(
                "flex-1 rounded-xl h-10",
                currentRsvp?.status === 'maybe' && "bg-amber-500 hover:bg-amber-600"
              )}
              onClick={() => onRsvp('maybe')}
              disabled={disabled}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Maybe
            </Button>
            <Button
              variant={currentRsvp?.status === 'not_going' ? 'default' : 'outline'}
              className={cn(
                "flex-1 rounded-xl h-10",
                currentRsvp?.status === 'not_going' && "bg-muted text-muted-foreground"
              )}
              onClick={() => onRsvp('not_going')}
              disabled={disabled}
            >
              <X className="w-4 h-4 mr-2" />
              Can't Go
            </Button>
          </div>
        </div>
      )}

      {/* Guest Summary */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Guest List</span>
          </div>

          {/* Counts - now showing total headcount */}
          <div className="flex gap-4 text-sm mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-foreground">{goingCount} attending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-foreground">{maybeCount} maybe</span>
            </div>
            {notGoingRsvps > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">{notGoingRsvps} can't go</span>
              </div>
            )}
          </div>

          {/* Names */}
          {(goingGuests.length > 0 || maybeGuests.length > 0) && (
            <div className="space-y-2 text-sm">
              {goingGuests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Going: </span>
                  {goingGuests.map((g, i) => (
                    <span key={g.id} className="text-foreground">
                      {renderGuestName(g)}
                      {i < goingGuests.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
              {maybeGuests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Maybe: </span>
                  {maybeGuests.map((g, i) => (
                    <span key={g.id} className="text-foreground">
                      {renderGuestName(g)}
                      {i < maybeGuests.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {rsvps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No RSVPs yet. Be the first!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RsvpSection;
