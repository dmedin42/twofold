-- ============================================
-- POTLUCK PROTOCOL v3: Saved/Followed Potlucks
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create saved_potlucks table (users can follow potlucks they didn't create)
CREATE TABLE IF NOT EXISTS public.saved_potlucks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  potluck_id UUID REFERENCES public.potlucks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, potluck_id)
);

-- 2. Enable RLS
ALTER TABLE public.saved_potlucks ENABLE ROW LEVEL SECURITY;

-- 3. Users can view their own saved potlucks
CREATE POLICY "Users can view their saved potlucks"
ON public.saved_potlucks FOR SELECT
USING (user_id = auth.uid());

-- 4. Users can save public potlucks
CREATE POLICY "Users can save public potlucks"
ON public.saved_potlucks FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.potlucks 
    WHERE id = potluck_id AND is_public = true
  )
);

-- 5. Users can unsave potlucks
CREATE POLICY "Users can unsave potlucks"
ON public.saved_potlucks FOR DELETE
USING (user_id = auth.uid());

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_saved_potlucks_user ON public.saved_potlucks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_potlucks_potluck ON public.saved_potlucks(potluck_id);

-- 7. Allow authenticated users to view public potlucks they saved
-- (Update existing policy to include saved potlucks)
DROP POLICY IF EXISTS "Users can view saved public potlucks" ON public.potlucks;
CREATE POLICY "Users can view saved public potlucks"
ON public.potlucks FOR SELECT
USING (
  is_public = true
  OR household_id IN (
    SELECT household_id FROM public.profiles WHERE id = auth.uid()
  )
  OR id IN (
    SELECT potluck_id FROM public.saved_potlucks WHERE user_id = auth.uid()
  )
);
