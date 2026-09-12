-- The latest saved analysis contains the user's personalised checklist.
-- It is deliberately scoped to the owner and never exposed to anonymous users.
create table if not exists public.benefit_analyses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analysis jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.benefit_analyses enable row level security;

grant select, insert, update on table public.benefit_analyses to authenticated;

create policy "Users can read their own benefit analysis"
  on public.benefit_analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own benefit analysis"
  on public.benefit_analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own benefit analysis"
  on public.benefit_analyses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
