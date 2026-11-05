-- ============================================
-- POTLUCK MASTER SCHEMA
-- Complete reset & setup - run this ONCE
-- ============================================

-- =============================================
-- STEP 1: Clean up existing objects
-- =============================================

-- Drop existing policies on potluck tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('potlucks', 'potluck_items', 'potluck_rsvps', 'saved_potlucks')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Drop tables in correct order (dependencies first)
DROP TABLE IF EXISTS public.saved_potlucks CASCADE;
DROP TABLE IF EXISTS public.potluck_rsvps CASCADE;
DROP TABLE IF EXISTS public.potluck_items CASCADE;
DROP TABLE IF EXISTS public.potlucks CASCADE;

-- Drop the enum if exists
DROP TYPE IF EXISTS public.rsvp_status CASCADE;

-- Drop the helper function if exists
DROP FUNCTION IF EXISTS public.can_view_potluck(UUID);

-- =============================================
-- STEP 2: Create base tables
-- =============================================

-- Create potlucks table
CREATE TABLE public.potlucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_time TIME,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  share_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  category_limits JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create potluck_items table
CREATE TABLE public.potluck_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  potluck_id UUID REFERENCES public.potlucks(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  claimed_by_name TEXT,
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_needed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create RSVP status enum
CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'not_going');

-- Create potluck_rsvps table
CREATE TABLE public.potluck_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  potluck_id UUID REFERENCES public.potlucks(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status rsvp_status DEFAULT 'going' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(potluck_id, guest_name)
);

-- Create saved_potlucks table (for following potlucks)
CREATE TABLE public.saved_potlucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  potluck_id UUID REFERENCES public.potlucks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, potluck_id)
);

-- =============================================
-- STEP 3: Enable RLS on all tables
-- =============================================

ALTER TABLE public.potlucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_potlucks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: Create helper function
-- =============================================

CREATE OR REPLACE FUNCTION public.can_view_potluck(potluck_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.potlucks
    WHERE id = potluck_id 
    AND (
      is_public = true 
      OR owner_id = auth.uid()
      OR household_id IN (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
$$;

-- =============================================
-- STEP 5: Potlucks table policies
-- =============================================

-- Anyone can view public potlucks
CREATE POLICY "potlucks_select_public"
ON public.potlucks FOR SELECT
USING (is_public = true);

-- Household members can view their potlucks
CREATE POLICY "potlucks_select_household"
ON public.potlucks FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Users can view potlucks they saved
CREATE POLICY "potlucks_select_saved"
ON public.potlucks FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT potluck_id FROM public.saved_potlucks WHERE user_id = auth.uid()
  )
);

-- Household members can create potlucks
CREATE POLICY "potlucks_insert"
ON public.potlucks FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
  )
  AND owner_id = auth.uid()
);

-- Owner can update their potluck
CREATE POLICY "potlucks_update"
ON public.potlucks FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Owner can delete their potluck
CREATE POLICY "potlucks_delete"
ON public.potlucks FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =============================================
-- STEP 6: Potluck items policies
-- =============================================

-- Anyone can view items for viewable potlucks
CREATE POLICY "items_select"
ON public.potluck_items FOR SELECT
USING (public.can_view_potluck(potluck_id));

-- Anyone can add items to public potlucks (guests)
CREATE POLICY "items_insert_public"
ON public.potluck_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- Household members can add items to their potlucks
CREATE POLICY "items_insert_household"
ON public.potluck_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks p
    WHERE p.id = potluck_id
    AND p.household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Authenticated users can update their own claims
CREATE POLICY "items_update_auth"
ON public.potluck_items FOR UPDATE
TO authenticated
USING (
  claimed_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND owner_id = auth.uid()
  )
)
WITH CHECK (
  claimed_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND owner_id = auth.uid()
  )
);

-- Anon users can update items on public potlucks (for guest name matching)
CREATE POLICY "items_update_anon"
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

-- Authenticated users can delete their own claims
CREATE POLICY "items_delete_auth"
ON public.potluck_items FOR DELETE
TO authenticated
USING (
  claimed_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND owner_id = auth.uid()
  )
);

-- Anon users can delete on public potlucks
CREATE POLICY "items_delete_anon"
ON public.potluck_items FOR DELETE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- =============================================
-- STEP 7: RSVP policies
-- =============================================

-- Anyone can view RSVPs for viewable potlucks
CREATE POLICY "rsvps_select"
ON public.potluck_rsvps FOR SELECT
USING (public.can_view_potluck(potluck_id));

-- Anyone can RSVP to public potlucks
CREATE POLICY "rsvps_insert_public"
ON public.potluck_rsvps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- Household members can RSVP to their potlucks
CREATE POLICY "rsvps_insert_household"
ON public.potluck_rsvps FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks p
    WHERE p.id = potluck_id
    AND p.household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Users can update their own RSVP or owner can update any
CREATE POLICY "rsvps_update"
ON public.potluck_rsvps FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND owner_id = auth.uid()
  )
);

-- Users can delete their own RSVP or owner can delete any
CREATE POLICY "rsvps_delete"
ON public.potluck_rsvps FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND owner_id = auth.uid()
  )
);

-- =============================================
-- STEP 8: Saved potlucks policies
-- =============================================

-- Users can view their saved potlucks
CREATE POLICY "saved_select"
ON public.saved_potlucks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can save public potlucks
CREATE POLICY "saved_insert"
ON public.saved_potlucks FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- Users can unsave potlucks
CREATE POLICY "saved_delete"
ON public.saved_potlucks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- STEP 9: Create indexes
-- =============================================

CREATE INDEX idx_potlucks_share_code ON public.potlucks(share_code);
CREATE INDEX idx_potlucks_household ON public.potlucks(household_id);
CREATE INDEX idx_potlucks_owner ON public.potlucks(owner_id);
CREATE INDEX idx_potluck_items_potluck ON public.potluck_items(potluck_id);
CREATE INDEX idx_potluck_items_claimed_by ON public.potluck_items(claimed_by_user_id);
CREATE INDEX idx_potluck_rsvps_potluck ON public.potluck_rsvps(potluck_id);
CREATE INDEX idx_potluck_rsvps_user ON public.potluck_rsvps(user_id);
CREATE INDEX idx_potluck_rsvps_status ON public.potluck_rsvps(status);
CREATE INDEX idx_saved_potlucks_user ON public.saved_potlucks(user_id);
CREATE INDEX idx_saved_potlucks_potluck ON public.saved_potlucks(potluck_id);

-- =============================================
-- STEP 10: Create updated_at triggers
-- =============================================

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS set_potlucks_updated_at ON public.potlucks;
CREATE TRIGGER set_potlucks_updated_at
  BEFORE UPDATE ON public.potlucks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_potluck_items_updated_at ON public.potluck_items;
CREATE TRIGGER set_potluck_items_updated_at
  BEFORE UPDATE ON public.potluck_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_potluck_rsvps_updated_at ON public.potluck_rsvps;
CREATE TRIGGER set_potluck_rsvps_updated_at
  BEFORE UPDATE ON public.potluck_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- STEP 11: Enable Realtime
-- =============================================

-- Add tables to realtime publication (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.potluck_items;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.potluck_rsvps;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =============================================
-- STEP 12: Add recipe sharing columns (if not exist)
-- =============================================

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Create index for public recipes
CREATE INDEX IF NOT EXISTS idx_recipes_share_code ON public.recipes(share_code);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON public.recipes(is_public) WHERE is_public = true;

-- Policy for public recipe viewing (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Public recipes are viewable by anyone" ON public.recipes;
CREATE POLICY "Public recipes are viewable by anyone"
ON public.recipes FOR SELECT
USING (is_public = true);

-- =============================================
-- DONE!
-- =============================================
SELECT 'Potluck schema created successfully!' as result;
