-- Fix guard_profile_role: detect the service role by the absence of auth.uid()
-- (service-role JWTs have no user claim). Keep blocking self-promotion by
-- authenticated non-admins.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not coalesce((select public.is_admin()), false) then
      raise exception 'Only admins may change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.guard_profile_role() from public;
grant execute on function public.guard_profile_role() to authenticated, service_role;
