-- ============================================
-- POTLUCK PROTOCOL: Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create potlucks table (owner creates events)
CREATE TABLE public.potlucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  share_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Create potluck_items table (what's needed/claimed)
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

-- 3. Enable RLS
ALTER TABLE public.potlucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potluck_items ENABLE ROW LEVEL SECURITY;

-- 4. Create helper function to check potluck access (avoids recursion)
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

-- 5. RLS Policies for potlucks table

-- Anyone can view public potlucks
CREATE POLICY "Public potlucks are viewable by anyone"
ON public.potlucks FOR SELECT
USING (is_public = true);

-- Household members can view their potlucks
CREATE POLICY "Household members can view their potlucks"
ON public.potlucks FOR SELECT
USING (
  household_id IN (
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Only household members can create potlucks
CREATE POLICY "Household members can create potlucks"
ON public.potlucks FOR INSERT
WITH CHECK (
  household_id IN (
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
  )
  AND owner_id = auth.uid()
);

-- Only owner can update their potluck
CREATE POLICY "Owner can update their potluck"
ON public.potlucks FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Only owner can delete their potluck
CREATE POLICY "Owner can delete their potluck"
ON public.potlucks FOR DELETE
USING (owner_id = auth.uid());

-- 6. RLS Policies for potluck_items table

-- Anyone can view items for public potlucks
CREATE POLICY "Items viewable for public potlucks"
ON public.potluck_items FOR SELECT
USING (public.can_view_potluck(potluck_id));

-- Anyone can add items to public potlucks (guests can bring dishes)
CREATE POLICY "Anyone can add items to public potlucks"
ON public.potluck_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- Household members can add items to their potlucks
CREATE POLICY "Household members can add items"
ON public.potluck_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.potlucks p
    WHERE p.id = potluck_id
    AND p.household_id IN (
      SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Guests can only update/delete items they claimed (by name or user_id)
CREATE POLICY "Guests can update their own claims"
ON public.potluck_items FOR UPDATE
USING (
  claimed_by_user_id = auth.uid()
  OR (
    -- Potluck owner can update any item
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Guests can delete their own claims"
ON public.potluck_items FOR DELETE
USING (
  claimed_by_user_id = auth.uid()
  OR (
    -- Potluck owner can delete any item
    EXISTS (
      SELECT 1 FROM public.potlucks 
      WHERE id = potluck_id AND owner_id = auth.uid()
    )
  )
);

-- 7. Add is_public column to recipes table for public sharing
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- 8. RLS policy for public recipe viewing
CREATE POLICY "Public recipes are viewable by anyone"
ON public.recipes FOR SELECT
USING (is_public = true);

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_potlucks_share_code ON public.potlucks(share_code);
CREATE INDEX IF NOT EXISTS idx_potlucks_household ON public.potlucks(household_id);
CREATE INDEX IF NOT EXISTS idx_potluck_items_potluck ON public.potluck_items(potluck_id);
CREATE INDEX IF NOT EXISTS idx_recipes_share_code ON public.recipes(share_code);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON public.recipes(is_public) WHERE is_public = true;

-- 10. Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Apply updated_at triggers
DROP TRIGGER IF EXISTS set_potlucks_updated_at ON public.potlucks;
CREATE TRIGGER set_potlucks_updated_at
  BEFORE UPDATE ON public.potlucks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_potluck_items_updated_at ON public.potluck_items;
CREATE TRIGGER set_potluck_items_updated_at
  BEFORE UPDATE ON public.potluck_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
