-- ============================================================================
-- Assignment task files + notebook/image/PDF submission uploads
-- ============================================================================

-- Task file attached to an assignment (.ipynb, image or PDF).
alter table public.assignments
  add column if not exists task_file_path text,
  add column if not exists task_file_name text;

-- Submissions may now be notebooks, images or PDFs (up to 10 MB).
update storage.buckets
set file_size_limit = 10485760
where id = 'submissions';

-- Public bucket: students must be able to read the task file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-tasks', 'assignment-tasks', true, 10485760)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760;

drop policy if exists "submissions_student_upload_own_folder" on storage.objects;
create policy "submissions_student_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and lower(name) like any (array[
      '%.py', '%.ipynb', '%.png', '%.jpg', '%.jpeg', '%.webp', '%.gif', '%.pdf'
    ])
  );

drop policy if exists "assignment_tasks_admin_write" on storage.objects;
create policy "assignment_tasks_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'assignment-tasks' and public.is_admin())
  with check (bucket_id = 'assignment-tasks' and public.is_admin());
