-- ============================================
-- POTLUCK PROTOCOL v2: Enhanced Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- NOTE: Run this AFTER the original potluck-schema.sql

-- 1. Add event_time column to potlucks table
ALTER TABLE public.potlucks ADD COLUMN IF NOT EXISTS event_time TIME;

-- 2. Add category_limits JSONB column for configurable limits per category
-- Example: {"Main Dish": 3, "Dessert": 2, "Drinks": 4}
ALTER TABLE public.potlucks ADD COLUMN IF NOT EXISTS category_limits JSONB DEFAULT '{}';

-- 3. Create RSVP status enum
DO $$ BEGIN
  CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'not_going');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Create potluck_rsvps table for attendance tracking
CREATE TABLE IF NOT EXISTS public.potluck_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  potluck_id UUID REFERENCES public.potlucks(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status rsvp_status DEFAULT 'going' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(potluck_id, guest_name)
);

-- 5. Enable RLS on rsvps
ALTER TABLE public.potluck_rsvps ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for potluck_rsvps

-- Anyone can view RSVPs for public potlucks
CREATE POLICY "RSVPs viewable for public potlucks"
ON public.potluck_rsvps FOR SELECT
USING (public.can_view_potluck(potluck_id));

-- Anyone can RSVP to public potlucks
CREATE POLICY "Anyone can RSVP to public potlucks"
ON public.potluck_rsvps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- Guests can update their own RSVP (by name match or user_id)
CREATE POLICY "Guests can update their own RSVP"
ON public.potluck_rsvps FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    -- Potluck owner can update any RSVP
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
);

-- Guests can delete their own RSVP
CREATE POLICY "Guests can delete their own RSVP"
ON public.potluck_rsvps FOR DELETE
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
);

-- 7. Household members can RSVP to their household potlucks
CREATE POLICY "Household members can RSVP to their potlucks"
ON public.potluck_rsvps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks p
    WHERE p.id = potluck_id
    AND p.household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_potluck_rsvps_potluck ON public.potluck_rsvps(potluck_id);
CREATE INDEX IF NOT EXISTS idx_potluck_rsvps_user ON public.potluck_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_potluck_rsvps_status ON public.potluck_rsvps(status);

-- 9. Apply updated_at trigger to rsvps
DROP TRIGGER IF EXISTS set_potluck_rsvps_updated_at ON public.potluck_rsvps;
CREATE TRIGGER set_potluck_rsvps_updated_at
  BEFORE UPDATE ON public.potluck_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Update policy to allow guests to update their own items by name
-- (for editing dishes they claimed)
DROP POLICY IF EXISTS "Guests can update their own claims" ON public.potluck_items;
CREATE POLICY "Guests can update their own claims"
ON public.potluck_items FOR UPDATE
USING (
  claimed_by_user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  claimed_by_user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
);

-- 11. Allow anon users to update items (for guest name matching, handled in app)
DROP POLICY IF EXISTS "Anon can update claimed items" ON public.potluck_items;
CREATE POLICY "Anon can update claimed items"
ON public.potluck_items FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- 12. Allow anon to delete their own claimed items
DROP POLICY IF EXISTS "Anon can delete their claims" ON public.potluck_items;
CREATE POLICY "Anon can delete their claims"
ON public.potluck_items FOR DELETE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- 13. Enable Realtime for potluck tables
-- Run these commands to add tables to the realtime publication:
-- NOTE: You may need to run these manually if they fail

-- Check if publication exists, if not it will be created automatically by Supabase
-- Just add the tables to the existing publication:

ALTER PUBLICATION supabase_realtime ADD TABLE public.potluck_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.potluck_rsvps;
