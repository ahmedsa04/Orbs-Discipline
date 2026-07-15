-- Discipline Tracker schema
-- Permanent history, RLS, no consecutive rest days, failure finalization

create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  timezone text not null default 'Asia/Riyadh',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  weigh_in_weekday int not null default 1 check (weigh_in_weekday between 0 and 6),
  weigh_in_time text not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily tracking
create table public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  exercise_status text not null default 'pending'
    check (exercise_status in ('pending', 'completed', 'rest', 'failure')),
  nutrition_status text not null default 'pending'
    check (nutrition_status in ('pending', 'healthy', 'failure')),
  notes text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index daily_records_user_date_idx on public.daily_records (user_id, date);

-- Append-only audit trail
create table public.daily_record_audit (
  id uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  field text not null,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index daily_record_audit_user_date_idx on public.daily_record_audit (user_id, date);

-- Weight check-ins
create table public.weight_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  weight numeric(6,2) not null check (weight > 0),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index weight_checkins_user_date_idx on public.weight_checkins (user_id, date desc);

-- Reminder preferences
create table public.reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('exercise', 'nutrition', 'end_of_day', 'weight')),
  time_local text not null,
  enabled boolean not null default true,
  sort_order int not null default 0
);

create index reminder_preferences_user_idx on public.reminder_preferences (user_id);

-- Push subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Notification delivery log (dedupe + history)
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  preference_id uuid references public.reminder_preferences (id) on delete set null,
  kind text not null,
  dedupe_key text not null,
  title text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index notification_logs_user_sent_idx on public.notification_logs (user_id, sent_at desc);

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger daily_records_updated_at
  before update on public.daily_records
  for each row execute function public.set_updated_at();

-- No consecutive rest days (previous and next neighbors)
create or replace function public.enforce_no_consecutive_rest()
returns trigger
language plpgsql
as $$
declare
  prev_status text;
  next_status text;
begin
  if new.exercise_status = 'rest' then
    select exercise_status into prev_status
    from public.daily_records
    where user_id = new.user_id and date = (new.date - 1);

    select exercise_status into next_status
    from public.daily_records
    where user_id = new.user_id and date = (new.date + 1);

    if prev_status = 'rest' then
      raise exception 'Cannot rest two days in a row (previous day is rest)';
    end if;
    if next_status = 'rest' then
      raise exception 'Cannot rest two days in a row (next day is rest)';
    end if;
  end if;
  return new;
end;
$$;

create trigger daily_records_no_consecutive_rest
  before insert or update of exercise_status on public.daily_records
  for each row execute function public.enforce_no_consecutive_rest();

-- Audit changes to status fields
create or replace function public.audit_daily_record_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.daily_record_audit (daily_record_id, user_id, date, field, old_value, new_value, reason)
    values
      (new.id, new.user_id, new.date, 'exercise_status', null, new.exercise_status, 'create'),
      (new.id, new.user_id, new.date, 'nutrition_status', null, new.nutrition_status, 'create');
    return new;
  end if;

  if old.exercise_status is distinct from new.exercise_status then
    insert into public.daily_record_audit (daily_record_id, user_id, date, field, old_value, new_value, reason)
    values (new.id, new.user_id, new.date, 'exercise_status', old.exercise_status, new.exercise_status, 'update');
  end if;

  if old.nutrition_status is distinct from new.nutrition_status then
    insert into public.daily_record_audit (daily_record_id, user_id, date, field, old_value, new_value, reason)
    values (new.id, new.user_id, new.date, 'nutrition_status', old.nutrition_status, new.nutrition_status, 'update');
  end if;

  return new;
end;
$$;

create trigger daily_records_audit
  after insert or update on public.daily_records
  for each row execute function public.audit_daily_record_changes();

-- Seed profile + default reminders on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.reminder_preferences (user_id, kind, time_local, enabled, sort_order)
  values
    (new.id, 'exercise', '09:00', true, 1),
    (new.id, 'exercise', '14:00', true, 2),
    (new.id, 'exercise', '18:00', true, 3),
    (new.id, 'nutrition', '12:30', true, 4),
    (new.id, 'nutrition', '20:00', true, 5),
    (new.id, 'end_of_day', '21:30', true, 6),
    (new.id, 'weight', '08:00', true, 7);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Finalize unresolved past days for a user (timezone-aware date string YYYY-MM-DD as p_today)
create or replace function public.finalize_past_days(p_user_id uuid, p_today date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  -- Ensure today row exists as pending so UI always has a target
  insert into public.daily_records (user_id, date)
  values (p_user_id, p_today)
  on conflict (user_id, date) do nothing;

  update public.daily_records
  set
    exercise_status = case when exercise_status = 'pending' then 'failure' else exercise_status end,
    nutrition_status = case when nutrition_status = 'pending' then 'failure' else nutrition_status end,
    finalized_at = coalesce(finalized_at, now())
  where user_id = p_user_id
    and date < p_today
    and finalized_at is null
    and (exercise_status = 'pending' or nutrition_status = 'pending');

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.daily_records enable row level security;
alter table public.daily_record_audit enable row level security;
alter table public.weight_checkins enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "daily_records_own" on public.daily_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_record_audit_select_own" on public.daily_record_audit
  for select using (auth.uid() = user_id);

-- Audit inserts only via trigger (security definer path); block direct writes from clients
create policy "daily_record_audit_no_client_write" on public.daily_record_audit
  for insert with check (false);

create policy "weight_checkins_own" on public.weight_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminder_preferences_own" on public.reminder_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_subscriptions_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_logs_select_own" on public.notification_logs
  for select using (auth.uid() = user_id);

create policy "notification_logs_insert_own" on public.notification_logs
  for insert with check (auth.uid() = user_id);

-- Grant execute on finalize to authenticated users (scoped by their uid in app)
grant execute on function public.finalize_past_days(uuid, date) to authenticated;
