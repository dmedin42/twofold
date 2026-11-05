-- =============================================
-- COMPLETE RLS FIX: Infinite Recursion Issues
-- =============================================
-- 
-- The error shows: "infinite recursion detected in policy for relation household_members"
-- This means the table is called "household_members" (not "household_memberships")
--
-- Run this ENTIRE script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bfxzevpnpyeovcqvrotw/sql
-- =============================================

-- =============================================
-- STEP 1: Create/Update Helper Functions (SECURITY DEFINER)
-- These functions bypass RLS to prevent recursion
-- =============================================

-- Function to get current user's household ID directly from profiles
CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT household_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Function to check if user belongs to a household
CREATE OR REPLACE FUNCTION public.is_household_member(target_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND household_id = target_household_id
    )
$$;

-- Function to check if user can manage a household
CREATE OR REPLACE FUNCTION public.can_manage_household(target_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND household_id = target_household_id
    )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_household_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_household(UUID) TO authenticated;

-- =============================================
-- STEP 2: Fix household_members policies (THIS IS THE KEY TABLE!)
-- =============================================

-- Drop ALL existing policies on household_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'household_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.household_members', pol.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies for household_members
CREATE POLICY "hm_select_policy"
    ON public.household_members FOR SELECT
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "hm_insert_policy"
    ON public.household_members FOR INSERT
    TO authenticated
    WITH CHECK (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "hm_update_policy"
    ON public.household_members FOR UPDATE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "hm_delete_policy"
    ON public.household_members FOR DELETE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

-- =============================================
-- STEP 3: Fix inventory_items policies
-- =============================================

-- Drop ALL existing policies on inventory_items
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'inventory_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_items', pol.policyname);
    END LOOP;
END $$;

-- Create simple policies that use the security definer function
CREATE POLICY "inv_select_policy"
    ON public.inventory_items FOR SELECT
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "inv_insert_policy"
    ON public.inventory_items FOR INSERT
    TO authenticated
    WITH CHECK (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "inv_update_policy"
    ON public.inventory_items FOR UPDATE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "inv_delete_policy"
    ON public.inventory_items FOR DELETE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

-- =============================================
-- STEP 4: Also fix household_memberships if it exists
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'household_memberships' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.household_memberships', pol.policyname);
    END LOOP;
EXCEPTION WHEN undefined_table THEN
    NULL; -- Table doesn't exist, skip
END $$;

-- Only create if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'household_memberships') THEN
        EXECUTE 'CREATE POLICY "hms_select_policy" ON public.household_memberships FOR SELECT TO authenticated USING (household_id = public.get_user_household_id())';
        EXECUTE 'CREATE POLICY "hms_insert_policy" ON public.household_memberships FOR INSERT TO authenticated WITH CHECK (household_id = public.get_user_household_id())';
        EXECUTE 'CREATE POLICY "hms_update_policy" ON public.household_memberships FOR UPDATE TO authenticated USING (household_id = public.get_user_household_id())';
        EXECUTE 'CREATE POLICY "hms_delete_policy" ON public.household_memberships FOR DELETE TO authenticated USING (household_id = public.get_user_household_id())';
    END IF;
END $$;

-- =============================================
-- STEP 5: Fix grocery_lists policies
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'grocery_lists' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.grocery_lists', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "gl_select_policy"
    ON public.grocery_lists FOR SELECT
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "gl_insert_policy"
    ON public.grocery_lists FOR INSERT
    TO authenticated
    WITH CHECK (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "gl_update_policy"
    ON public.grocery_lists FOR UPDATE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

CREATE POLICY "gl_delete_policy"
    ON public.grocery_lists FOR DELETE
    TO authenticated
    USING (
        household_id = public.get_user_household_id()
    );

-- =============================================
-- STEP 6: Fix grocery_list_items policies
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'grocery_list_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.grocery_list_items', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "gli_select_policy"
    ON public.grocery_list_items FOR SELECT
    TO authenticated
    USING (
        grocery_list_id IN (
            SELECT id FROM public.grocery_lists 
            WHERE household_id = public.get_user_household_id()
        )
    );

CREATE POLICY "gli_insert_policy"
    ON public.grocery_list_items FOR INSERT
    TO authenticated
    WITH CHECK (
        grocery_list_id IN (
            SELECT id FROM public.grocery_lists 
            WHERE household_id = public.get_user_household_id()
        )
    );

CREATE POLICY "gli_update_policy"
    ON public.grocery_list_items FOR UPDATE
    TO authenticated
    USING (
        grocery_list_id IN (
            SELECT id FROM public.grocery_lists 
            WHERE household_id = public.get_user_household_id()
        )
    );

CREATE POLICY "gli_delete_policy"
    ON public.grocery_list_items FOR DELETE
    TO authenticated
    USING (
        grocery_list_id IN (
            SELECT id FROM public.grocery_lists 
            WHERE household_id = public.get_user_household_id()
        )
    );

-- =============================================
-- Done! Refresh your app and test again.
-- =============================================
SELECT 'RLS policies updated successfully!' as result;
