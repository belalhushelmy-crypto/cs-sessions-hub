-- ============================================================================
-- Session materials: staff-managed file / link / note items per session.
-- ============================================================================

do $$ begin
  create type public.material_kind as enum ('file', 'link', 'note');
exception when duplicate_object then null; end $$;

create table if not exists public.session_materials (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 160),
  kind          public.material_kind not null,
  url           text,
  storage_path  text,
  storage_bucket text not null default 'materials',
  note_body     text,
  position      integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  published     boolean not null default true,
  constraint material_has_content check (
    kind = 'note' or (kind = 'file' and storage_path is not null) or (kind = 'link' and url is not null)
  )
);

create index if not exists session_materials_session_idx
  on public.session_materials (session_id, published, position, created_at);

alter table public.session_materials enable row level security;

drop policy if exists "session_materials_select" on public.session_materials;
create policy "session_materials_select" on public.session_materials
  for select to authenticated
  using (published or public.is_staff());

drop policy if exists "session_materials_staff_all" on public.session_materials;
create policy "session_materials_staff_all" on public.session_materials
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on public.session_materials from anon;
grant select on public.session_materials to authenticated;
grant insert, update, delete on public.session_materials to authenticated;
grant all on public.session_materials to service_role;

-- Legacy session_files rows become published file materials (if any exist).
insert into public.session_materials (
  session_id, title, kind, storage_path, storage_bucket, created_by, published
)
select f.session_id, f.file_name, 'file', f.file_path, 'session-materials', f.uploaded_by, true
from public.session_files f
where not exists (
  select 1 from public.session_materials m where m.storage_path = f.file_path
);

-- Private bucket; students receive short-lived signed URLs from a server action.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "materials_staff_insert" on storage.objects;
create policy "materials_staff_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and public.is_staff());

drop policy if exists "materials_staff_update" on storage.objects;
create policy "materials_staff_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'materials' and public.is_staff())
  with check (bucket_id = 'materials' and public.is_staff());

drop policy if exists "materials_staff_delete" on storage.objects;
create policy "materials_staff_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and public.is_staff());
