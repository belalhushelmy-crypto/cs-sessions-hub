-- Excused attendance: recorded but awards no points (existing point functions
-- already return 0 for any status other than present/late).
do $$ begin
  alter type public.attendance_status add value if not exists 'excused';
exception when duplicate_object then null; end $$;
