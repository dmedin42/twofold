import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { User, Plus, Minus, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestIdentityCardProps {
  guestName: string;
  extraGuests: number;
  isLockedIn: boolean;
  onNameChange: (name: string) => void;
  onExtraGuestsChange: (count: number) => void;
  onLockIn: () => void;
  onEdit: () => void;
  disabled?: boolean;
}

const GuestIdentityCard: React.FC<GuestIdentityCardProps> = ({
  guestName,
  extraGuests,
  isLockedIn,
  onNameChange,
  onExtraGuestsChange,
  onLockIn,
  onEdit,
  disabled,
}) => {
  const handleIncrement = () => {
    if (extraGuests < 10) {
      onExtraGuestsChange(extraGuests + 1);
    }
  };

  const handleDecrement = () => {
    if (extraGuests > 0) {
      onExtraGuestsChange(extraGuests - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && guestName.trim()) {
      onLockIn();
    }
  };

  if (isLockedIn) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{guestName}</span>
                  {extraGuests > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      +{extraGuests} guest{extraGuests > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">That's you!</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your Name</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your name..."
              value={guestName}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl bg-background/50 flex-1"
              disabled={disabled}
            />
            <Button
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0"
              onClick={onLockIn}
              disabled={!guestName.trim() || disabled}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bringing extra guests?</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={handleDecrement}
              disabled={extraGuests === 0 || disabled}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className={cn(
              "min-w-[80px] text-center py-2 px-4 rounded-xl font-medium",
              extraGuests > 0 
                ? "bg-primary/10 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {extraGuests === 0 ? 'Just me' : `+${extraGuests}`}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={handleIncrement}
              disabled={extraGuests >= 10 || disabled}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GuestIdentityCard;
