-- ============================================================================
-- Guard role changes: only admins (or the service role used by admin actions)
-- may change public.profiles.role. Without this, RLS's profiles_update_own
-- policy lets any student PATCH their own row and promote themselves.
-- ============================================================================

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       and not coalesce((select public.is_admin()), false) then
      raise exception 'Only admins may change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.guard_profile_role() from public;
grant execute on function public.guard_profile_role() to authenticated, service_role;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
