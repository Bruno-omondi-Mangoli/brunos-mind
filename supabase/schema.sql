create extension if not exists "pgcrypto";

create table public.skill_areas (
  id text primary key,
  title text not null,
  weight_percent numeric not null,
  sort_order int not null
);

create table public.worlds (
  id text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 0
);

create table public.concepts (
  id text primary key,
  skill_area_id text not null references public.skill_areas(id),
  title text not null,
  official_summary text not null,
  reviewed boolean not null default false,
  sort_order int not null default 0
);

create table public.concept_explanations (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references public.concepts(id) on delete cascade,
  world_id text not null references public.worlds(id),
  lang text not null check (lang in ('en','sw')),
  analogy text not null,
  plain text not null,
  exam text not null,
  reviewed boolean not null default false,
  unique (concept_id, world_id, lang)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references public.concepts(id) on delete cascade,
  stem text not null,
  options jsonb not null,
  difficulty int not null default 1 check (difficulty between 1 and 3),
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  world_id text not null default 'matatu' references public.worlds(id),
  lang text not null default 'en' check (lang in ('en','sw')),
  exam_date date,
  weekly_hours numeric,
  low_power boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  concept_id text not null references public.concepts(id),
  chosen_option text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);
create index attempts_user_concept_idx on public.attempts (user_id, concept_id, created_at desc);

create table public.card_states (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concept_id text not null references public.concepts(id),
  box int not null default 1 check (box between 1 and 5),
  due_at timestamptz not null default now(),
  streak int not null default 0,
  lapses int not null default 0,
  primary key (user_id, concept_id)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game text not null check (game in ('analogy_match','layer_sort','outage_survivor','capex_opex')),
  concept_ids text[] not null default '{}',
  score int not null default 0,
  max_score int not null default 1,
  created_at timestamptz not null default now()
);
create index game_sessions_user_idx on public.game_sessions (user_id, created_at desc);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

create table public.ai_cache (
  cache_key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.skill_areas enable row level security;
alter table public.worlds enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_explanations enable row level security;
alter table public.questions enable row level security;
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.card_states enable row level security;
alter table public.game_sessions enable row level security;
alter table public.study_plans enable row level security;
alter table public.ai_cache enable row level security;

create policy "read skill_areas" on public.skill_areas for select to anon, authenticated using (true);
create policy "read worlds" on public.worlds for select to anon, authenticated using (true);
create policy "read concepts" on public.concepts for select to anon, authenticated using (true);
create policy "read explanations" on public.concept_explanations for select to anon, authenticated using (true);
create policy "read questions" on public.questions for select to anon, authenticated using (true);

create policy "profiles select own" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "attempts select own" on public.attempts for select to authenticated using (user_id = auth.uid());
create policy "attempts insert own" on public.attempts for insert to authenticated with check (user_id = auth.uid());

create policy "cards select own" on public.card_states for select to authenticated using (user_id = auth.uid());
create policy "cards insert own" on public.card_states for insert to authenticated with check (user_id = auth.uid());
create policy "cards update own" on public.card_states for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "games select own" on public.game_sessions for select to authenticated using (user_id = auth.uid());
create policy "games insert own" on public.game_sessions for insert to authenticated with check (user_id = auth.uid());

create policy "plans select own" on public.study_plans for select to authenticated using (user_id = auth.uid());
create policy "plans insert own" on public.study_plans for insert to authenticated with check (user_id = auth.uid());
create policy "plans delete own" on public.study_plans for delete to authenticated using (user_id = auth.uid());

insert into public.skill_areas (id, title, weight_percent, sort_order) values
  ('cloud_concepts', 'Describe cloud concepts', 30, 1),
  ('architecture_services', 'Describe Azure architecture and services', 35, 2),
  ('management_governance', 'Describe Azure management and governance', 35, 3);

insert into public.worlds (id, name, description, sort_order) values
  ('matatu', 'Matatu Routes', 'Routes, stages, fares, saccos and traffic', 1),
  ('mobile_money', 'Mobile Money', 'Agents, wallets, limits and PINs', 2),
  ('cooperative', 'Farm Cooperative', 'Shared stores, members, shared costs and rules', 3),
  ('market', 'Market Stall', 'Stalls, rent, suppliers and market officials', 4);