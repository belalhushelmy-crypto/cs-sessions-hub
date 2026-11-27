-- The submissions table gained `submission_type` after the original column-level
-- INSERT grant was written, so student submits were rejected with
-- "permission denied for table submissions". RLS still enforces ownership.
grant insert on public.submissions to authenticated;
