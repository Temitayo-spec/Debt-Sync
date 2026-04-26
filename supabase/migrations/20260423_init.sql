create extension if not exists "pgcrypto";

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null default 'Shared expense',
  notes text,
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references public.profiles (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.expense_participants (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  primary key (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete restrict,
  to_user_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (from_user_id <> to_user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists on_groups_updated on public.groups;
create trigger on_groups_updated
before update on public.groups
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create or replace function public.group_has_member(
  target_group_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlements enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Members can read groups" on public.groups;
create policy "Members can read groups"
on public.groups
for select
to authenticated
using (public.is_group_member(id));

drop policy if exists "Authenticated users can create groups" on public.groups;
create policy "Authenticated users can create groups"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Owners can update groups" on public.groups;
create policy "Owners can update groups"
on public.groups
for update
to authenticated
using (public.is_group_owner(id))
with check (public.is_group_owner(id));

drop policy if exists "Members can read group members" on public.group_members;
create policy "Members can read group members"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists "Owners can add group members" on public.group_members;
create policy "Owners can add group members"
on public.group_members
for insert
to authenticated
with check (public.is_group_owner(group_id));

drop policy if exists "Owners can remove group members" on public.group_members;
create policy "Owners can remove group members"
on public.group_members
for delete
to authenticated
using (public.is_group_owner(group_id));

drop policy if exists "Members can read expenses" on public.expenses;
create policy "Members can read expenses"
on public.expenses
for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists "Members can create expenses" on public.expenses;
create policy "Members can create expenses"
on public.expenses
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
  and public.group_has_member(group_id, paid_by)
);

drop policy if exists "Members can read expense participants" on public.expense_participants;
create policy "Members can read expense participants"
on public.expense_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_id
      and public.is_group_member(e.group_id)
  )
);

drop policy if exists "Members can create expense participants" on public.expense_participants;
create policy "Members can create expense participants"
on public.expense_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_id
      and public.is_group_member(e.group_id)
      and public.group_has_member(e.group_id, user_id)
  )
);

drop policy if exists "Members can read settlements" on public.settlements;
create policy "Members can read settlements"
on public.settlements
for select
to authenticated
using (public.is_group_member(group_id));

drop policy if exists "Members can create settlements" on public.settlements;
create policy "Members can create settlements"
on public.settlements
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
  and public.group_has_member(group_id, from_user_id)
  and public.group_has_member(group_id, to_user_id)
);
