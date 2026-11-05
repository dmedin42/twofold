-- Chef Journey Milestones table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.chef_journey_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  items_added_count integer DEFAULT 0 NOT NULL,
  first_scan_at timestamptz,
  first_recipe_saved_at timestamptz,
  first_cooking_mode_at timestamptz,
  first_household_invite_at timestamptz,
  household_member_count integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.chef_journey_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own milestones"
  ON public.chef_journey_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON public.chef_journey_milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones"
  ON public.chef_journey_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-create row on signup via trigger
CREATE OR REPLACE FUNCTION public.create_chef_journey_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.chef_journey_milestones (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach to auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_chef_journey ON auth.users;
CREATE TRIGGER on_auth_user_created_chef_journey
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chef_journey_on_signup();

-- Backfill existing users
INSERT INTO public.chef_journey_milestones (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_journey_milestones;
