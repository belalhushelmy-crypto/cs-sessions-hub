-- ============================================================================
-- Session materials (up to 100 MB) + stored AI grading credentials/model
-- ============================================================================

-- One row per file uploaded for a session.
create table if not exists public.session_files (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  file_path   text not null unique,
  file_name   text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes  bigint not null check (size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists session_files_session_idx
  on public.session_files (session_id, created_at desc);

alter table public.session_files enable row level security;

drop policy if exists "session_files_read_all" on public.session_files;
create policy "session_files_read_all" on public.session_files
  for select to authenticated using (true);

drop policy if exists "session_files_staff_write" on public.session_files;
create policy "session_files_staff_write" on public.session_files
  for all to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

revoke all on public.session_files from anon;
grant select on public.session_files to authenticated;
grant insert, update, delete on public.session_files to authenticated;
grant all on public.session_files to service_role;

-- Public bucket: students may download session materials directly.
insert into storage.buckets (id, name, public, file_size_limit)
values ('session-materials', 'session-materials', true, 104857600)
on conflict (id) do update
  set public = true,
      file_size_limit = 104857600;

drop policy if exists "session_materials_staff_write" on storage.objects;
create policy "session_materials_staff_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'session-materials' and public.is_teacher_or_admin())
  with check (bucket_id = 'session-materials' and public.is_teacher_or_admin());

-- AI grading settings: service role only (never exposed to the browser).
create table if not exists public.ai_grading_settings (
  id         boolean primary key default true check (id),
  api_key    text,
  model      text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.ai_grading_settings (id) values (true)
on conflict (id) do nothing;

alter table public.ai_grading_settings enable row level security;
revoke all on public.ai_grading_settings from anon, authenticated;
grant select, insert, update, delete on public.ai_grading_settings to service_role;
