-- ============================================================
-- Mission Control & Guided Experience - Database Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- A. Global System Settings (Kill Switch)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value_bool boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_settings (key, value_bool)
VALUES ('is_ai_enabled', true) ON CONFLICT DO NOTHING;

-- B. Recipe Stories (Emotional Connection)
CREATE TABLE IF NOT EXISTS public.recipe_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recipe_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can read recipe stories"
  ON public.recipe_stories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_stories.recipe_id
        AND r.household_id = public.get_user_household_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert their own stories"
  ON public.recipe_stories FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own stories"
  ON public.recipe_stories FOR UPDATE TO authenticated
  USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own stories"
  ON public.recipe_stories FOR DELETE TO authenticated
  USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- C. Chef Journey Stats View
CREATE OR REPLACE VIEW public.chef_journey_stats AS
SELECT 
  p.id as profile_id,
  p.user_id,
  (SELECT COUNT(*) FROM inventory_items WHERE added_by_profile_id = p.id) as items_added,
  EXISTS(SELECT 1 FROM operator_events WHERE user_id = p.user_id AND event_name = 'generate_recipe') as has_used_ai,
  EXISTS(SELECT 1 FROM operator_events WHERE user_id = p.user_id AND event_name = 'enter_cooking_mode') as has_cooked,
  EXISTS(SELECT 1 FROM recipe_stories WHERE profile_id = p.id) as has_shared_story,
  (SELECT COUNT(*) FROM household_memberships WHERE household_id = p.household_id) as household_size
FROM profiles p;

-- D. Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_stories;
