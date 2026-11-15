-- =====================================================================
-- CivicEye schema. Run once in the Supabase SQL editor on a fresh project.
-- Order: schema.sql, duplicates.sql, daily_summaries.sql, (users), seed.sql
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  role       text not null default 'citizen' check (role in ('citizen','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id              uuid primary key default gen_random_uuid(),
  department_name text not null unique,
  description     text
);

create sequence if not exists public.complaint_number_seq start 1;

create table if not exists public.complaints (
  id                uuid primary key default gen_random_uuid(),
  complaint_number  text unique,
  user_id           uuid not null references public.users(id) on delete cascade,
  title             text not null,
  description       text,
  ai_description    text,
  category          text not null check (category in (
    'Road Damage','Garbage & Sanitation','Street Lighting','Water Supply & Leakage',
    'Drainage & Sewage','Public Safety','Public Infrastructure','Other')),
  subcategory       text,
  severity          text not null check (severity in ('Critical','High','Medium','Low')),
  priority_score    int  not null default 0 check (priority_score between 0 and 100),
  ai_confidence     numeric check (ai_confidence is null or (ai_confidence between 0 and 1)),
  safety_risk       boolean not null default false,
  department        text check (department is null or department in (
    'Road Maintenance','Sanitation','Electrical & Lighting','Water Works',
    'Drainage & Sewerage','Public Safety','General Administration')),
  latitude          double precision not null check (latitude between -90 and 90),
  longitude         double precision not null check (longitude between -180 and 180),
  address           text,
  image_url         text,
  audio_url         text,
  status            text not null default 'SUBMITTED' check (status in (
    'SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','REJECTED','DUPLICATE')),
  incident_group_id uuid,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.complaint_updates (
  id              uuid primary key default gen_random_uuid(),
  complaint_id    uuid not null references public.complaints(id) on delete cascade,
  previous_status text,
  new_status      text not null,
  remarks         text,
  updated_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.complaint_assignments (
  id            uuid primary key default gen_random_uuid(),
  complaint_id  uuid not null references public.complaints(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  assigned_by   uuid references public.users(id) on delete set null,
  assigned_at   timestamptz not null default now()
);

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  complaint_id uuid references public.complaints(id) on delete cascade,
  title        text not null,
  message      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.complaint_relations (
  id                   uuid primary key default gen_random_uuid(),
  complaint_id         uuid not null references public.complaints(id) on delete cascade,
  related_complaint_id uuid not null references public.complaints(id) on delete cascade,
  similarity_score     numeric not null check (similarity_score between 0 and 1),
  review_status        text not null default 'PENDING' check (review_status in ('PENDING','MERGED','SEPARATE')),
  created_at           timestamptz not null default now(),
  check (complaint_id <> related_complaint_id),
  unique (complaint_id, related_complaint_id)
);

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------
create index if not exists idx_complaints_user_id    on public.complaints(user_id);
create index if not exists idx_complaints_status     on public.complaints(status);
create index if not exists idx_complaints_severity   on public.complaints(severity);
create index if not exists idx_complaints_category   on public.complaints(category);
create index if not exists idx_complaints_latlng     on public.complaints(latitude, longitude);
create index if not exists idx_complaints_created_at on public.complaints(created_at desc);
create index if not exists idx_complaints_text_trgm  on public.complaints using gin
  ((coalesce(title,'') || ' ' || coalesce(description,'')) extensions.gin_trgm_ops);
create index if not exists idx_updates_complaint     on public.complaint_updates(complaint_id);
create index if not exists idx_assign_complaint      on public.complaint_assignments(complaint_id);
create index if not exists idx_notif_user            on public.notifications(user_id, is_read);
create index if not exists idx_rel_complaint         on public.complaint_relations(complaint_id);
create index if not exists idx_rel_related           on public.complaint_relations(related_complaint_id);

-- ---------------------------------------------------------------------
-- 3. SEED DEPARTMENTS
-- ---------------------------------------------------------------------
insert into public.departments (department_name, description) values
  ('Road Maintenance',       'Potholes, damaged roads, footpaths and road markings'),
  ('Sanitation',             'Garbage collection, litter and sanitation issues'),
  ('Electrical & Lighting',  'Street lights, exposed wiring and public electrical faults'),
  ('Water Works',            'Water supply disruptions and pipe leakage'),
  ('Drainage & Sewerage',    'Blocked drains, sewage overflow and open manholes'),
  ('Public Safety',          'Hazards posing immediate risk to people or property'),
  ('General Administration', 'Public infrastructure and issues that fit no other department')
on conflict (department_name) do nothing;

-- ---------------------------------------------------------------------
-- 4. HELPER FUNCTIONS
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- New auth user -> public.users row (role citizen)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'citizen'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- complaint_number: CIV-<year>-<5 digits>
create or replace function public.set_complaint_number()
returns trigger
language plpgsql as $$
begin
  if new.complaint_number is null then
    new.complaint_number := 'CIV-' || to_char(now(), 'YYYY') || '-' ||
                            lpad(nextval('public.complaint_number_seq')::text, 5, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_complaint_number on public.complaints;
create trigger trg_complaint_number
  before insert on public.complaints
  for each row execute function public.set_complaint_number();

-- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_complaints_touch on public.complaints;
create trigger trg_complaints_touch
  before update on public.complaints
  for each row execute function public.touch_updated_at();

-- On insert: history row + "Complaint received" notification
create or replace function public.handle_new_complaint()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.complaint_updates (complaint_id, previous_status, new_status, remarks, updated_by)
  values (new.id, null, new.status, 'Complaint submitted', new.user_id);

  insert into public.notifications (user_id, complaint_id, title, message)
  values (new.user_id, new.id, 'Complaint received',
          'Your complaint ' || new.complaint_number || ' has been received and is awaiting review.');
  return new;
end $$;

drop trigger if exists trg_complaint_created on public.complaints;
create trigger trg_complaint_created
  after insert on public.complaints
  for each row execute function public.handle_new_complaint();

-- On status change: history row + citizen notification.
-- Remarks and actor come from transaction-local settings set by admin_update_complaint().
create or replace function public.handle_status_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_remarks text := nullif(current_setting('app.remarks', true), '');
  v_actor   uuid := nullif(current_setting('app.actor', true), '')::uuid;
  v_label   text;
begin
  if new.status is distinct from old.status then
    insert into public.complaint_updates (complaint_id, previous_status, new_status, remarks, updated_by)
    values (new.id, old.status, new.status, v_remarks, coalesce(v_actor, auth.uid()));

    v_label := case new.status
      when 'SUBMITTED'    then 'submitted'
      when 'UNDER_REVIEW' then 'under review'
      when 'ASSIGNED'     then 'assigned to a department'
      when 'IN_PROGRESS'  then 'in progress'
      when 'RESOLVED'     then 'resolved'
      when 'REJECTED'     then 'rejected'
      when 'DUPLICATE'    then 'marked as a duplicate of an existing report'
      else lower(new.status) end;

    insert into public.notifications (user_id, complaint_id, title, message)
    values (new.user_id, new.id,
            'Complaint ' || new.complaint_number || ' updated',
            'Your complaint is now ' || v_label || '.' ||
            case when v_remarks is not null then ' Note from the authority: ' || v_remarks else '' end);
  end if;
  return new;
end $$;

drop trigger if exists trg_complaint_status on public.complaints;
create trigger trg_complaint_status
  after update of status on public.complaints
  for each row execute function public.handle_status_change();

-- Internal RPC used ONLY by the update-status Edge Function (service role).
-- Assignment rule: whenever the complaint is ASSIGNED or IN_PROGRESS and has a department,
-- write a complaint_assignments row unless the latest assignment already points at that department.
create or replace function public.admin_update_complaint(
  p_complaint_id uuid,
  p_actor        uuid,
  p_new_status   text default null,
  p_remarks      text default null,
  p_department   text default null,
  p_severity     text default null,
  p_category     text default null
) returns public.complaints
language plpgsql security definer set search_path = public as $$
declare
  v_row  public.complaints;
  v_dept uuid;
  v_last uuid;
begin
  if not exists (select 1 from public.users where id = p_actor and role = 'admin') then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  perform set_config('app.remarks', coalesce(p_remarks, ''), true);
  perform set_config('app.actor', p_actor::text, true);

  update public.complaints
     set status     = coalesce(p_new_status, status),
         department = coalesce(p_department, department),
         severity   = coalesce(p_severity, severity),
         category   = coalesce(p_category, category)
   where id = p_complaint_id
   returning * into v_row;

  if not found then
    raise exception 'complaint_not_found' using errcode = 'P0002';
  end if;

  if v_row.status in ('ASSIGNED','IN_PROGRESS') and v_row.department is not null then
    select id into v_dept from public.departments where department_name = v_row.department;
    select department_id into v_last from public.complaint_assignments
     where complaint_id = p_complaint_id order by assigned_at desc limit 1;
    if v_dept is not null and v_last is distinct from v_dept then
      insert into public.complaint_assignments (complaint_id, department_id, assigned_by)
      values (p_complaint_id, v_dept, p_actor);
    end if;
  end if;

  return v_row;
end $$;

revoke execute on function public.admin_update_complaint(uuid,uuid,text,text,text,text,text) from public, anon, authenticated;
grant  execute on function public.admin_update_complaint(uuid,uuid,text,text,text,text,text) to service_role;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.users                 enable row level security;
alter table public.departments           enable row level security;
alter table public.complaints            enable row level security;
alter table public.complaint_updates     enable row level security;
alter table public.complaint_assignments enable row level security;
alter table public.notifications         enable row level security;
alter table public.complaint_relations   enable row level security;

-- users: read own row (admins read all). No client-side updates, so role cannot be self-escalated.
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- departments: readable by any signed-in user
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments for select to authenticated using (true);

-- complaints
drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints for insert to authenticated
  with check (user_id = auth.uid() and status = 'SUBMITTED' and is_demo = false);

drop policy if exists complaints_admin_update on public.complaints;
create policy complaints_admin_update on public.complaints for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- complaint_updates
drop policy if exists updates_select on public.complaint_updates;
create policy updates_select on public.complaint_updates for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.complaints c where c.id = complaint_id and c.user_id = auth.uid()));

drop policy if exists updates_admin_insert on public.complaint_updates;
create policy updates_admin_insert on public.complaint_updates for insert to authenticated
  with check (public.is_admin());

-- complaint_assignments
drop policy if exists assign_select on public.complaint_assignments;
create policy assign_select on public.complaint_assignments for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.complaints c where c.id = complaint_id and c.user_id = auth.uid()));

drop policy if exists assign_admin_insert on public.complaint_assignments;
create policy assign_admin_insert on public.complaint_assignments for insert to authenticated
  with check (public.is_admin());

-- notifications: own only; citizens may change only is_read
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update on public.notifications from authenticated;
grant  update (is_read) on public.notifications to authenticated;

-- complaint_relations: admin only
drop policy if exists rel_admin_select on public.complaint_relations;
create policy rel_admin_select on public.complaint_relations for select to authenticated
  using (public.is_admin());

drop policy if exists rel_admin_insert on public.complaint_relations;
create policy rel_admin_insert on public.complaint_relations for insert to authenticated
  with check (public.is_admin());

drop policy if exists rel_admin_update on public.complaint_relations;
create policy rel_admin_update on public.complaint_relations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. PUBLIC VIEW FOR THE EXPLORE MAP (no personal data)
-- ---------------------------------------------------------------------
create or replace view public.public_complaints
with (security_invoker = false) as
  select id, complaint_number, title, category, severity, status,
         latitude, longitude, created_at, is_demo
  from public.complaints
  where status <> 'REJECTED';

revoke all on public.public_complaints from public, anon;
-- anon is granted on purpose: the Landing page stats and /explore are public routes (view has no personal data).
-- To make the map sign-in only, delete "anon," below and re-run this statement.
grant  select on public.public_complaints to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. STORAGE
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('complaint-images', 'complaint-images', true),
  ('complaint-audio',  'complaint-audio',  false)
on conflict (id) do nothing;

-- images: public read, authenticated upload to <user_id>/...
drop policy if exists "images public read" on storage.objects;
create policy "images public read" on storage.objects for select
  using (bucket_id = 'complaint-images');

drop policy if exists "images own upload" on storage.objects;
create policy "images own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "images own delete" on storage.objects;
create policy "images own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- audio: private, owner + admin read, upload to own folder
drop policy if exists "audio own upload" on storage.objects;
create policy "audio own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'complaint-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audio owner or admin read" on storage.objects;
create policy "audio owner or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'complaint-audio'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------------------------------------------------------------------
-- 8. REALTIME (live notifications and dashboard)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.complaints;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 9. PROMOTE A USER TO ADMIN (run manually after the user has signed up)
-- ---------------------------------------------------------------------
-- update public.users set role = 'admin' where email = 'admin@example.com';
