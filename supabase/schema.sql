create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  line_name text,
  phone_number text,
  base_daily_rate integer not null default 0 check (base_daily_rate >= 0),
  bank_name text,
  bank_branch text,
  bank_account_type text,
  bank_account_number text,
  bank_account_holder text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shift_availabilities (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  work_date date not null,
  availability text not null check (availability in ('yes', 'no')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, work_date)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  work_date date not null,
  store_name text not null,
  address text,
  meeting_time time not null default '09:40',
  start_time time not null default '10:00',
  end_time time not null default '18:00',
  break_minutes integer not null default 60 check (break_minutes >= 0),
  required_people integer not null default 1 check (required_people > 0),
  project_daily_rate integer check (project_daily_rate is null or project_daily_rate >= 0),
  memo text,
  status text not null default 'active' check (status in ('draft', 'active', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  daily_rate integer not null check (daily_rate >= 0),
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'cancelled')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, member_id)
);

create table public.transportation_expenses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount integer not null check (amount >= 0),
  route_memo text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  admin_comment text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.monthly_settlements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  target_month text not null check (target_month ~ '^[0-9]{4}-[0-9]{2}$'),
  work_days integer not null default 0 check (work_days >= 0),
  daily_rate_total integer not null default 0 check (daily_rate_total >= 0),
  transportation_total integer not null default 0 check (transportation_total >= 0),
  payment_total integer not null default 0 check (payment_total >= 0),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, target_month)
);

create table public.monthly_settlement_items (
  id uuid primary key default gen_random_uuid(),
  monthly_settlement_id uuid not null references public.monthly_settlements(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  work_date date not null,
  project_title text not null,
  store_name text not null,
  daily_rate integer not null check (daily_rate >= 0),
  transportation_amount integer not null default 0 check (transportation_amount >= 0),
  transportation_status text check (
    transportation_status is null
    or transportation_status in ('submitted', 'approved', 'rejected')
  ),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index shift_availabilities_work_date_idx on public.shift_availabilities(work_date);
create index projects_work_date_idx on public.projects(work_date);
create index assignments_member_status_idx on public.assignments(member_id, status);
create index assignments_project_status_idx on public.assignments(project_id, status);
create index transportation_expenses_member_status_idx on public.transportation_expenses(member_id, status);
create index monthly_settlements_target_month_idx on public.monthly_settlements(target_month);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger shift_availabilities_set_updated_at
before update on public.shift_availabilities
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create trigger transportation_expenses_set_updated_at
before update on public.transportation_expenses
for each row execute function public.set_updated_at();

create trigger monthly_settlements_set_updated_at
before update on public.monthly_settlements
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.current_member_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.members
  where profile_id = auth.uid()
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.shift_availabilities enable row level security;
alter table public.projects enable row level security;
alter table public.assignments enable row level security;
alter table public.transportation_expenses enable row level security;
alter table public.monthly_settlements enable row level security;
alter table public.monthly_settlement_items enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin"
on public.profiles for insert
with check (public.is_admin());

create policy "profiles_update_admin"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "members_select_own_or_admin"
on public.members for select
using (profile_id = auth.uid() or public.is_admin());

create policy "members_insert_admin"
on public.members for insert
with check (public.is_admin());

create policy "members_update_admin"
on public.members for update
using (public.is_admin())
with check (public.is_admin());

create policy "shift_select_own_or_admin"
on public.shift_availabilities for select
using (member_id = public.current_member_id() or public.is_admin());

create policy "shift_insert_own_or_admin"
on public.shift_availabilities for insert
with check (member_id = public.current_member_id() or public.is_admin());

create policy "shift_update_own_or_admin"
on public.shift_availabilities for update
using (member_id = public.current_member_id() or public.is_admin())
with check (member_id = public.current_member_id() or public.is_admin());

create policy "projects_select_confirmed_member_or_admin"
on public.projects for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.assignments
    where assignments.project_id = projects.id
      and assignments.member_id = public.current_member_id()
      and assignments.status = 'confirmed'
  )
);

create policy "projects_insert_admin"
on public.projects for insert
with check (public.is_admin());

create policy "projects_update_admin"
on public.projects for update
using (public.is_admin())
with check (public.is_admin());

create policy "assignments_select_confirmed_own_or_admin"
on public.assignments for select
using (
  public.is_admin()
  or (
    member_id = public.current_member_id()
    and status = 'confirmed'
  )
);

create policy "assignments_insert_admin"
on public.assignments for insert
with check (
  public.is_admin()
  and exists (
    select 1
    from public.projects
    join public.shift_availabilities
      on shift_availabilities.work_date = projects.work_date
    where projects.id = assignments.project_id
      and shift_availabilities.member_id = assignments.member_id
      and shift_availabilities.availability = 'yes'
  )
);

create policy "assignments_update_admin"
on public.assignments for update
using (public.is_admin())
with check (
  public.is_admin()
  and exists (
    select 1
    from public.projects
    join public.shift_availabilities
      on shift_availabilities.work_date = projects.work_date
    where projects.id = assignments.project_id
      and shift_availabilities.member_id = assignments.member_id
      and shift_availabilities.availability = 'yes'
  )
);

create policy "expenses_select_own_or_admin"
on public.transportation_expenses for select
using (member_id = public.current_member_id() or public.is_admin());

create policy "expenses_insert_own_confirmed_assignment"
on public.transportation_expenses for insert
with check (
  member_id = public.current_member_id()
  and status = 'submitted'
  and exists (
    select 1
    from public.assignments
    where assignments.id = transportation_expenses.assignment_id
      and assignments.member_id = transportation_expenses.member_id
      and assignments.status = 'confirmed'
  )
);

create policy "expenses_update_admin"
on public.transportation_expenses for update
using (public.is_admin())
with check (public.is_admin());

create policy "expenses_update_own_rejected"
on public.transportation_expenses for update
using (
  member_id = public.current_member_id()
  and status = 'rejected'
)
with check (
  member_id = public.current_member_id()
  and status = 'submitted'
  and exists (
    select 1
    from public.assignments
    where assignments.id = transportation_expenses.assignment_id
      and assignments.member_id = transportation_expenses.member_id
      and assignments.status = 'confirmed'
  )
);

create policy "settlements_select_own_or_admin"
on public.monthly_settlements for select
using (member_id = public.current_member_id() or public.is_admin());

create policy "settlements_insert_admin"
on public.monthly_settlements for insert
with check (public.is_admin());

create policy "settlements_update_admin"
on public.monthly_settlements for update
using (public.is_admin())
with check (public.is_admin());

create policy "settlement_items_select_own_or_admin"
on public.monthly_settlement_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.monthly_settlements
    where monthly_settlements.id = monthly_settlement_items.monthly_settlement_id
      and monthly_settlements.member_id = public.current_member_id()
  )
);

create policy "settlement_items_insert_admin"
on public.monthly_settlement_items for insert
with check (public.is_admin());
