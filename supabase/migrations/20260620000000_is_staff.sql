-- ============================================================================
-- Staff = admin OR teacher. Replace is_admin() gates with is_staff() wherever
-- the permission matrix allows teachers. Student-owned policies are untouched.
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'teacher')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff();
$$;

revoke all on function public.is_teacher_or_admin() from public;
grant execute on function public.is_teacher_or_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies that still used is_admin() only.
-- ---------------------------------------------------------------------------
drop policy if exists "student_badges_admin_select_all" on public.student_badges;
create policy "student_badges_admin_select_all" on public.student_badges
  for select to authenticated using (public.is_staff());

drop policy if exists "similarity_admin_all" on public.submission_similarity;
create policy "similarity_admin_all" on public.submission_similarity
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "submissions_admin_select_all" on public.submissions;
create policy "submissions_admin_select_all" on public.submissions
  for select to authenticated using (public.is_staff());

-- Storage: staff may read/delete any submission and manage assignment tasks.
drop policy if exists "submissions_read_own_or_admin" on storage.objects;
create policy "submissions_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      split_part(name, '/', 1) = (select auth.uid())::text
      or public.is_staff()
    )
  );

drop policy if exists "submissions_admin_delete" on storage.objects;
create policy "submissions_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'submissions' and public.is_staff());

drop policy if exists "assignment_tasks_admin_write" on storage.objects;
create policy "assignment_tasks_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'assignment-tasks' and public.is_staff())
  with check (bucket_id = 'assignment-tasks' and public.is_staff());

-- ---------------------------------------------------------------------------
-- Definer RPCs: teachers may use all staff reporting/attendance functions.
-- guard_profile_role stays admin-only (role changes remain admin-only).
-- ---------------------------------------------------------------------------
do $$
declare
  fn record;
  definition text;
begin
  for fn in
    select p.oid
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosrc like '%is_admin()%'
      and p.proname not in ('guard_profile_role', 'is_admin', 'is_staff', 'is_teacher_or_admin')
  loop
    definition := pg_get_functiondef(fn.oid);
    definition := replace(definition, 'public.is_admin()', 'public.is_staff()');
    definition := replace(definition, 'is_admin()', 'is_staff()');
    execute definition;
  end loop;
end $$;
