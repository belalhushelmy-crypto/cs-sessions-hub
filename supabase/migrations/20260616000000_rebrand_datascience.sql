-- ============================================================================
-- CS Sessions Hub → Data Science SFE rebrand
-- 1. Student codes now use the DS- prefix.
-- 2. Submission uploads accept Python source (.py) instead of .cpp.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. student_code default: DS-0001
-- ---------------------------------------------------------------------------
alter table public.profiles
  alter column student_code set default ('DS-' || lpad(nextval('public.student_code_seq')::text, 4, '0'));

-- Renumber existing rows that still carry the old CS- prefix.
update public.profiles
set student_code = 'DS-' || substring(student_code from 4)
where student_code like 'CS-%';

-- ---------------------------------------------------------------------------
-- 2. Storage policy: accept .py uploads
-- ---------------------------------------------------------------------------
drop policy if exists "submissions_student_upload_own_folder" on storage.objects;
create policy "submissions_student_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and lower(name) like '%.py'
  );

notify pgrst, 'reload schema';
