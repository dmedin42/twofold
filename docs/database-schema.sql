-- =============================================
-- TWOFOLD ZERO-WASTE DATABASE SCHEMA
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bfxzevpnpyeovcqvrotw/sql
-- =============================================

-- 1. ENUMS
-- =============================================

CREATE TYPE public.household_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.item_status AS ENUM ('fresh', 'warning', 'expired', 'consumed', 'wasted');
CREATE TYPE public.item_ownership AS ENUM ('global', 'personal');

-- =============================================
-- 2. BASE TABLES
-- =============================================

-- Households table (accounts)
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Profiles table (users within households)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8B5CF6',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Household memberships (role management)
CREATE TABLE public.household_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role household_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(household_id, profile_id)
);

-- Inventory items table
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pieces',
    expiry_date DATE,
    status item_status NOT NULL DEFAULT 'fresh',
    ownership item_ownership NOT NULL DEFAULT 'global',
    owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    added_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    storage_tip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes table
CREATE TABLE public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    servings INTEGER NOT NULL DEFAULT 4,
    prep_time INTEGER DEFAULT 15,
    cook_time INTEGER DEFAULT 30,
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    is_ai_generated BOOLEAN DEFAULT false,
    source_items TEXT[],
    created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grocery lists table
CREATE TABLE public.grocery_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Shopping List',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grocery list items table
CREATE TABLE public.grocery_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grocery_list_id UUID REFERENCES public.grocery_lists(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pieces',
    category TEXT,
    is_purchased BOOLEAN NOT NULL DEFAULT false,
    added_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Waste logs table (for zero-waste tracking)
CREATE TABLE public.waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity_wasted NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    reason TEXT CHECK (reason IN ('overbought', 'forgot', 'poor_storage', 'didnt_like', 'other')),
    wasted_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    wasted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. HELPER FUNCTIONS (Security Definer)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_current_household()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT household_id FROM public.profiles WHERE user_id = auth.uid()
$$;

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

CREATE OR REPLACE FUNCTION public.is_profile_owner(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = target_profile_id
        AND user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.has_household_role(target_household_id UUID, target_role household_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.household_memberships hm
        JOIN public.profiles p ON p.id = hm.profile_id
        WHERE hm.household_id = target_household_id
        AND p.user_id = auth.uid()
        AND hm.role = target_role
    )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_household(target_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.household_memberships hm
        JOIN public.profiles p ON p.id = hm.profile_id
        WHERE hm.household_id = target_household_id
        AND p.user_id = auth.uid()
        AND hm.role IN ('owner', 'admin')
    )
$$;

-- =============================================
-- 4. ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- HOUSEHOLDS POLICIES
CREATE POLICY "Users can view their own household"
    ON public.households FOR SELECT
    TO authenticated
    USING (public.is_household_member(id));

CREATE POLICY "Users can create a household"
    ON public.households FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Household managers can update"
    ON public.households FOR UPDATE
    TO authenticated
    USING (public.can_manage_household(id));

CREATE POLICY "Household owners can delete"
    ON public.households FOR DELETE
    TO authenticated
    USING (public.has_household_role(id, 'owner'));

-- PROFILES POLICIES
CREATE POLICY "Users can view profiles in their household"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        public.is_household_member(household_id)
    );

CREATE POLICY "Users can create their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- HOUSEHOLD MEMBERSHIPS POLICIES
CREATE POLICY "Users can view memberships in their household"
    ON public.household_memberships FOR SELECT
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Household managers can create memberships"
    ON public.household_memberships FOR INSERT
    TO authenticated
    WITH CHECK (public.can_manage_household(household_id));

CREATE POLICY "Household managers can update memberships"
    ON public.household_memberships FOR UPDATE
    TO authenticated
    USING (public.can_manage_household(household_id));

CREATE POLICY "Household managers can delete memberships"
    ON public.household_memberships FOR DELETE
    TO authenticated
    USING (public.can_manage_household(household_id));

-- INVENTORY ITEMS POLICIES
CREATE POLICY "Users can view inventory in their household"
    ON public.inventory_items FOR SELECT
    TO authenticated
    USING (
        public.is_household_member(household_id) AND
        (NOT is_private OR owner_profile_id = public.get_current_profile())
    );

CREATE POLICY "Users can add inventory to their household"
    ON public.inventory_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Users can update inventory in their household"
    ON public.inventory_items FOR UPDATE
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can delete inventory in their household"
    ON public.inventory_items FOR DELETE
    TO authenticated
    USING (public.is_household_member(household_id));

-- RECIPES POLICIES
CREATE POLICY "Users can view recipes in their household"
    ON public.recipes FOR SELECT
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can add recipes to their household"
    ON public.recipes FOR INSERT
    TO authenticated
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Users can update recipes in their household"
    ON public.recipes FOR UPDATE
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can delete recipes in their household"
    ON public.recipes FOR DELETE
    TO authenticated
    USING (public.is_household_member(household_id));

-- GROCERY LISTS POLICIES
CREATE POLICY "Users can view grocery lists in their household"
    ON public.grocery_lists FOR SELECT
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can create grocery lists in their household"
    ON public.grocery_lists FOR INSERT
    TO authenticated
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Users can update grocery lists in their household"
    ON public.grocery_lists FOR UPDATE
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can delete grocery lists in their household"
    ON public.grocery_lists FOR DELETE
    TO authenticated
    USING (public.is_household_member(household_id));

-- GROCERY LIST ITEMS POLICIES
CREATE POLICY "Users can view grocery items via list membership"
    ON public.grocery_list_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.grocery_lists gl
            WHERE gl.id = grocery_list_id
            AND public.is_household_member(gl.household_id)
        )
    );

CREATE POLICY "Users can add grocery items via list membership"
    ON public.grocery_list_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.grocery_lists gl
            WHERE gl.id = grocery_list_id
            AND public.is_household_member(gl.household_id)
        )
    );

CREATE POLICY "Users can update grocery items via list membership"
    ON public.grocery_list_items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.grocery_lists gl
            WHERE gl.id = grocery_list_id
            AND public.is_household_member(gl.household_id)
        )
    );

CREATE POLICY "Users can delete grocery items via list membership"
    ON public.grocery_list_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.grocery_lists gl
            WHERE gl.id = grocery_list_id
            AND public.is_household_member(gl.household_id)
        )
    );

-- WASTE LOGS POLICIES
CREATE POLICY "Users can view waste logs in their household"
    ON public.waste_logs FOR SELECT
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can create waste logs in their household"
    ON public.waste_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Users can update waste logs in their household"
    ON public.waste_logs FOR UPDATE
    TO authenticated
    USING (public.is_household_member(household_id));

CREATE POLICY "Users can delete waste logs in their household"
    ON public.waste_logs FOR DELETE
    TO authenticated
    USING (public.is_household_member(household_id));

-- =============================================
-- 6. TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_grocery_lists_updated_at
    BEFORE UPDATE ON public.grocery_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create membership when profile joins household
CREATE OR REPLACE FUNCTION public.handle_profile_household_join()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.household_id IS NOT NULL AND (OLD.household_id IS NULL OR OLD.household_id != NEW.household_id) THEN
        IF NOT EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = NEW.household_id) THEN
            INSERT INTO public.household_memberships (household_id, profile_id, role)
            VALUES (NEW.household_id, NEW.id, 'owner');
        ELSE
            INSERT INTO public.household_memberships (household_id, profile_id, role)
            VALUES (NEW.household_id, NEW.id, 'member')
            ON CONFLICT (household_id, profile_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_household_join
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_household_join();

CREATE TRIGGER on_profile_initial_household
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    WHEN (NEW.household_id IS NOT NULL)
    EXECUTE FUNCTION public.handle_profile_household_join();

-- =============================================
-- 7. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_household_id ON public.profiles(household_id);
CREATE INDEX idx_inventory_items_household_id ON public.inventory_items(household_id);
CREATE INDEX idx_inventory_items_expiry_date ON public.inventory_items(expiry_date);
CREATE INDEX idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX idx_recipes_household_id ON public.recipes(household_id);
CREATE INDEX idx_grocery_lists_household_id ON public.grocery_lists(household_id);
CREATE INDEX idx_grocery_list_items_grocery_list_id ON public.grocery_list_items(grocery_list_id);
CREATE INDEX idx_waste_logs_household_id ON public.waste_logs(household_id);
CREATE INDEX idx_household_memberships_household_id ON public.household_memberships(household_id);
CREATE INDEX idx_household_memberships_profile_id ON public.household_memberships(profile_id);
