-- Close off database functions that anyone could call through the API.
--
-- increment_savings (the SECURITY DEFINER version the app uses) could update any
-- profile's savings totals, even without signing in. It now only updates the
-- caller's own profile. The two-argument version runs with the caller's
-- permissions, so row-level security already limits it.
create or replace function public.increment_savings(profile_id uuid, amount numeric, items_count integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set savings_total = coalesce(savings_total, 0) + amount,
         items_rescued_total = coalesce(items_rescued_total, 0) + items_count
   where id = increment_savings.profile_id
     and user_id = auth.uid();
end;
$$;

revoke all on function public.increment_savings(uuid, numeric, integer) from public, anon;
revoke all on function public.increment_savings(uuid, numeric) from public, anon;
grant execute on function public.increment_savings(uuid, numeric, integer) to authenticated;
grant execute on function public.increment_savings(uuid, numeric) to authenticated;

-- Superseded by join_household(), which checks the code and blocks guests.
revoke all on function public.join_household_by_code(text) from public, anon, authenticated;

-- Not used by the app; nobody needs it without signing in.
revoke all on function public.create_household_with_profile(text, text) from public, anon;
