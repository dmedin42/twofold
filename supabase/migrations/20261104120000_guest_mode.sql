-- Guest mode
--
-- Visitors can explore TwoFold without an account. The app signs them in with a
-- Supabase anonymous session, and the signup trigger gives that session its own
-- "Guest Kitchen" household filled with sample data. Guest accounts and their
-- data are deleted after 24 hours by an hourly pg_cron job.
--
-- Because anyone can now get a signed-in session with one click, this migration
-- also tightens three policies that used to trust any signed-in user:
--   * profiles were readable by everyone, including email addresses
--   * every household (and its join code) was readable by any signed-in user
--   * a user could point their profile at any household id and read its data
-- Joining a household now goes through join_household(), which checks the code.

-- ---------------------------------------------------------------------------
-- 1. Sample data for a new guest household
-- ---------------------------------------------------------------------------
create or replace function public.seed_guest_demo(p_user_id uuid, p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
  d date := current_date;
begin
  -- Only ever seed an empty household.
  if exists (select 1 from public.inventory_items where household_id = p_household_id) then
    return;
  end if;

  insert into public.inventory_items
    (household_id, name, category, quantity, unit, expiry_date, added_by_profile_id, estimated_value)
  values
    (p_household_id, 'Strawberries',    'Produce', 1,   'lb',     d,       p_user_id, 4.00),
    (p_household_id, 'Baby spinach',    'Produce', 1,   'bag',    d + 1,   p_user_id, 3.50),
    (p_household_id, 'Cilantro',        'Produce', 1,   'bunch',  d + 1,   p_user_id, 1.00),
    (p_household_id, 'Chicken thighs',  'Meat',    1.5, 'lb',     d + 2,   p_user_id, 7.00),
    (p_household_id, 'Avocados',        'Produce', 3,   'pieces', d + 2,   p_user_id, 3.75),
    (p_household_id, 'Greek yogurt',    'Dairy',   1,   'tub',    d + 3,   p_user_id, 5.00),
    (p_household_id, 'Sourdough bread', 'Bakery',  1,   'loaf',   d + 4,   p_user_id, 6.00),
    (p_household_id, 'Bell peppers',    'Produce', 2,   'pieces', d + 5,   p_user_id, 2.50),
    (p_household_id, 'Milk',            'Dairy',   0.5, 'gallon', d + 6,   p_user_id, 2.25),
    (p_household_id, 'Cheddar cheese',  'Dairy',   8,   'oz',     d + 14,  p_user_id, 4.50),
    (p_household_id, 'Eggs',            'Dairy',   12,  'pieces', d + 18,  p_user_id, 4.00),
    (p_household_id, 'Frozen peas',     'Frozen',  1,   'bag',    d + 120, p_user_id, 2.00),
    (p_household_id, 'Brown rice',      'Pantry',  2,   'lb',     d + 180, p_user_id, 3.00),
    (p_household_id, 'Black beans',     'Pantry',  2,   'cans',   d + 365, p_user_id, 2.00);

  insert into public.grocery_lists (household_id, name, is_active, created_by_profile_id)
  values (p_household_id, 'Shopping List', true, p_user_id)
  returning id into v_list_id;

  insert into public.grocery_list_items
    (grocery_list_id, name, quantity, unit, category, is_purchased, purchased_at, added_by_profile_id)
  values
    (v_list_id, 'Lemons',      2, 'pieces', 'Produce', false, null,  p_user_id),
    (v_list_id, 'Garlic',      1, 'head',   'Produce', false, null,  p_user_id),
    (v_list_id, 'Tortillas',   1, 'pack',   'Bakery',  false, null,  p_user_id),
    (v_list_id, 'Olive oil',   1, 'bottle', 'Pantry',  false, null,  p_user_id),
    (v_list_id, 'Bananas',     6, 'pieces', 'Produce', true,  now(), p_user_id);

  insert into public.recipes
    (household_id, name, description, ingredients, instructions, servings, prep_time, cook_time, tags, created_by_profile_id)
  values
    (p_household_id,
     'Chicken and Spinach Rice Bowls',
     'A weeknight bowl that uses up chicken and spinach before they turn.',
     '[{"name":"Chicken thighs","quantity":1.5,"unit":"lb"},
       {"name":"Brown rice","quantity":1.5,"unit":"cups"},
       {"name":"Baby spinach","quantity":4,"unit":"cups"},
       {"name":"Bell peppers","quantity":2,"unit":"pieces"},
       {"name":"Greek yogurt","quantity":0.5,"unit":"cup"},
       {"name":"Lemon","quantity":1,"unit":"piece"}]'::jsonb,
     '["Cook the brown rice according to the package.",
       "Season the chicken with salt, pepper, and paprika, then sear 6 to 7 minutes per side until cooked through.",
       "Slice the peppers and saute them in the same pan for 4 minutes, then wilt in the spinach.",
       "Stir lemon juice and a pinch of salt into the yogurt for a quick sauce.",
       "Slice the chicken and serve over rice with the vegetables and yogurt sauce."]'::jsonb,
     4, 15, 25, array['Dinner', 'High Protein'], p_user_id),
    (p_household_id,
     'Black Bean and Avocado Tacos',
     'Ten-minute vegetarian tacos built around ripe avocados.',
     '[{"name":"Black beans","quantity":1,"unit":"can"},
       {"name":"Avocados","quantity":2,"unit":"pieces"},
       {"name":"Tortillas","quantity":8,"unit":"pieces"},
       {"name":"Cilantro","quantity":0.25,"unit":"cup"},
       {"name":"Cheddar cheese","quantity":2,"unit":"oz"},
       {"name":"Lemon","quantity":1,"unit":"piece"}]'::jsonb,
     '["Rinse the black beans and warm them in a pan with cumin and a pinch of salt.",
       "Mash the avocados with lemon juice, salt, and chopped cilantro.",
       "Warm the tortillas in a dry skillet.",
       "Fill each tortilla with beans, avocado, and shredded cheddar."]'::jsonb,
     4, 10, 10, array['Vegetarian', 'Quick'], p_user_id),
    (p_household_id,
     'Strawberry Yogurt Parfaits',
     'A no-cook breakfast for strawberries that need to be eaten today.',
     '[{"name":"Strawberries","quantity":1,"unit":"lb"},
       {"name":"Greek yogurt","quantity":1.5,"unit":"cups"},
       {"name":"Granola","quantity":0.5,"unit":"cup"},
       {"name":"Honey","quantity":1,"unit":"tbsp"}]'::jsonb,
     '["Hull and slice the strawberries.",
       "Layer yogurt, strawberries, and granola in two glasses.",
       "Drizzle with honey and serve."]'::jsonb,
     2, 5, 0, array['Breakfast', 'Quick'], p_user_id);

  -- A little history so the savings and waste reports have something to show.
  insert into public.savings_logs (household_id, profile_id, amount, items_count, item_name, category, created_at)
  values
    (p_household_id, p_user_id, 4.00, 1, 'Ground turkey', 'Meat',    now() - interval '2 days'),
    (p_household_id, p_user_id, 2.50, 1, 'Zucchini',      'Produce', now() - interval '1 day'),
    (p_household_id, p_user_id, 2.00, 1, 'Bagels',        'Bakery',  now() - interval '3 hours');

  insert into public.waste_logs (household_id, name, quantity_wasted, unit, reason, wasted_by_profile_id, wasted_at)
  values (p_household_id, 'Romaine lettuce', 1.50, 'dollars', 'expired', p_user_id, now() - interval '4 days');

  update public.profiles
     set savings_total = 8.50, items_rescued_total = 3
   where id = p_user_id;
end;
$$;

revoke all on function public.seed_guest_demo(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Signup trigger: record who created the household, and seed guests
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  is_guest boolean := coalesce(new.is_anonymous, false);
  display_name text;
begin
  display_name := case
    when is_guest then 'Guest'
    else coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Chef')
  end;

  -- 1. A personal household for the new user
  insert into public.households (name, created_by)
  values (
    case when is_guest then 'Guest Kitchen'
         else coalesce(new.raw_user_meta_data->>'full_name', 'New') || ' Kitchen' end,
    new.id
  )
  returning id into new_household_id;

  -- 2. Profile (full_name is generated, so it is not inserted)
  insert into public.profiles (id, user_id, name, household_id)
  values (new.id, new.id, display_name, new_household_id);

  -- 3. Owner link
  insert into public.household_members (user_id, household_id, role)
  values (new.id, new_household_id, 'owner');

  -- 4. Guests start with a stocked sample kitchen. A seeding problem must never
  --    block the sign-in itself, so errors are logged and swallowed.
  if is_guest then
    begin
      perform public.seed_guest_demo(new.id, new_household_id);
    exception when others then
      raise warning 'seed_guest_demo failed for %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Delete guest sessions older than a day, with everything they created
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_guest_users(max_age interval default interval '24 hours')
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  expired uuid[];
  removed integer;
begin
  expired := array(
    select id from auth.users
     where is_anonymous and created_at < now() - max_age
  );
  if cardinality(expired) = 0 then
    return 0;
  end if;

  -- Households that only expired guests belong to (cascades to inventory,
  -- groceries, recipes, logs, potlucks and polls tied to the household).
  delete from public.households h
   where h.id in (select p.household_id from public.profiles p where p.user_id = any(expired))
     and not exists (
       select 1 from public.profiles p2
        where p2.household_id = h.id
          and not (p2.user_id = any(expired))
     );

  -- This table references auth.users without ON DELETE, so clear it first.
  delete from public.ai_chat_history where user_id = any(expired);

  delete from auth.users where id = any(expired);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_guest_users(interval) from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-guest-users';
select cron.schedule('cleanup-guest-users', '23 * * * *', $cron$select public.cleanup_guest_users()$cron$);

-- ---------------------------------------------------------------------------
-- 4. Tighter access now that anyone can get a session
-- ---------------------------------------------------------------------------

-- Profiles: only yourself and people in your household (no more public emails).
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Household members can view profiles" on public.profiles;
create policy "Household members can view profiles"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or household_id = public.get_user_household_id());

-- Households: only the one you belong to, or one you just created.
drop policy if exists allow_join_code_lookup on public.households;
drop policy if exists "Members can view their household" on public.households;
create policy "Members can view their household"
  on public.households for select to authenticated
  using (id = public.get_user_household_id() or created_by = (select auth.uid()));

-- Joining by code happens here instead of a client-side lookup.
create or replace function public.join_household(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to join a household';
  end if;
  if exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous) then
    raise exception 'Guests cannot join a household. Create a free account first.';
  end if;

  select h.id, h.name into v_id, v_name
    from public.households h
   where lower(h.join_code) = lower(trim(code))
   limit 1;

  if v_id is null then
    raise exception 'Invalid join code';
  end if;

  perform set_config('twofold.household_change', 'allowed', true);
  update public.profiles set household_id = v_id where user_id = auth.uid();

  return json_build_object('id', v_id, 'name', v_name);
end;
$$;

revoke all on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

-- A profile can only move into a household its user created, or through
-- join_household(). Leaving (setting it to null) is always allowed. Server-side
-- code with no signed-in user (triggers, the service role) is not restricted.
create or replace function public.guard_profile_household_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is not null
     and (tg_op = 'INSERT' or new.household_id is distinct from old.household_id)
     and auth.uid() is not null
     and coalesce(current_setting('twofold.household_change', true), '') <> 'allowed'
     and not exists (
       select 1 from public.households h
        where h.id = new.household_id and h.created_by = auth.uid()
     )
  then
    raise exception 'Use a join code to join a household';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_household_change on public.profiles;
create trigger guard_profile_household_change
  before insert or update of household_id on public.profiles
  for each row execute function public.guard_profile_household_change();
