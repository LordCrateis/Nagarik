create table if not exists public.citizen_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.citizen_profiles enable row level security;

grant select, insert, update on table public.citizen_profiles to authenticated;

create policy "Users can read their own citizen profile"
  on public.citizen_profiles for select
  using (auth.uid() = user_id);

create policy "Users can create their own citizen profile"
  on public.citizen_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own citizen profile"
  on public.citizen_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);