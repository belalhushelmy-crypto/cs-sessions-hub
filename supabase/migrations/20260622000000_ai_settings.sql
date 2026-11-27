-- ============================================================================
-- AI grading settings: single admin-owned row, env values as fallback.
-- The API key is never sent to the browser; the page only shows status.
-- ============================================================================

create table if not exists public.ai_settings (
  id                  boolean primary key default true check (id),
  api_key             text,
  auto_grade          boolean not null default true,
  model               text not null default 'gemini-2.5-flash',
  mock_mode           boolean not null default false,
  max_attempts        integer not null default 3 check (max_attempts between 1 and 10),
  upload_rate_limit   integer not null default 5 check (upload_rate_limit between 1 and 100),
  timeout_seconds     integer not null default 25 check (timeout_seconds between 5 and 120),
  retry_attempts      integer not null default 3 check (retry_attempts between 1 and 5),
  feedback_language   text not null default 'both' check (feedback_language in ('en', 'ar', 'both')),
  default_instructions text not null default '',
  updated_by          uuid references public.profiles (id) on delete set null,
  updated_at          timestamptz not null default now()
);

insert into public.ai_settings (id)
values (true)
on conflict (id) do nothing;

-- Carry over the key/model saved by the earlier AI settings screen.
update public.ai_settings s
set api_key = coalesce(old.api_key, s.api_key),
    model = coalesce(old.model, s.model)
from public.ai_grading_settings old
where old.id = true and s.id = true;

alter table public.ai_settings enable row level security;
revoke all on public.ai_settings from anon, authenticated;
grant select, insert, update, delete on public.ai_settings to service_role;

-- Per-assignment AI override.
create table if not exists public.ai_assignment_overrides (
  assignment_id uuid primary key references public.assignments (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ai_assignment_overrides enable row level security;
revoke all on public.ai_assignment_overrides from anon, authenticated;
grant select on public.ai_assignment_overrides to authenticated;
grant insert, update, delete on public.ai_assignment_overrides to service_role;

drop policy if exists "ai_overrides_read" on public.ai_assignment_overrides;
create policy "ai_overrides_read" on public.ai_assignment_overrides
  for select to authenticated using (true);
