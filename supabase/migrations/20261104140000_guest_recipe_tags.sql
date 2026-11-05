-- Tag the sample guest recipes with the cookbook's filter labels (Healthy,
-- Quick & Easy, Reduce Waste, ...) so the filter chips work on them.
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
     4, 15, 25, array['Healthy', 'Meal Prep', 'Reduce Waste'], p_user_id),
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
     4, 10, 10, array['Quick & Easy', 'Vegetarian'], p_user_id),
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
     2, 5, 0, array['Quick & Easy', 'Reduce Waste', 'Breakfast'], p_user_id);

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

-- Existing guest kitchens get the same tags.
update public.recipes r set tags = case r.name
    when 'Chicken and Spinach Rice Bowls' then array['Healthy', 'Meal Prep', 'Reduce Waste']
    when 'Black Bean and Avocado Tacos'    then array['Quick & Easy', 'Vegetarian']
    when 'Strawberry Yogurt Parfaits'      then array['Quick & Easy', 'Reduce Waste', 'Breakfast']
  end
 where r.name in ('Chicken and Spinach Rice Bowls', 'Black Bean and Avocado Tacos', 'Strawberry Yogurt Parfaits')
   and r.household_id in (
     select p.household_id from public.profiles p join auth.users u on u.id = p.user_id where u.is_anonymous
   );
