import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// Shown on every signed-in page while someone is exploring as a guest.
const GuestBanner: React.FC = () => {
  const [leaving, setLeaving] = useState(false);

  const createAccount = async () => {
    setLeaving(true);
    // The guest kitchen is a throwaway demo, so signing out simply discards it.
    await supabase.auth.signOut();
    window.location.href = '/auth?tab=signup';
  };

  return (
    <div className="w-full bg-primary text-primary-foreground pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-2 text-center">
          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
          You're exploring a sample kitchen as a guest. It resets after 24 hours.
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 rounded-full px-3 text-xs"
          onClick={createAccount}
          disabled={leaving}
        >
          {leaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create a free account'}
        </Button>
      </div>
    </div>
  );
};

export default GuestBanner;
