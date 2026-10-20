alter table public.skill_areas add column if not exists learn_url text;
alter table public.concepts add column if not exists learn_url text;

alter table public.questions add column if not exists status text not null default 'approved';
alter table public.questions add column if not exists ai_checked boolean not null default false;
alter table public.questions add column if not exists check_note text;
alter table public.questions add column if not exists source text not null default 'seed';
alter table public.questions add constraint questions_status_check check (status in ('draft','approved','rejected'));

drop policy if exists "read questions" on public.questions;
create policy "read approved questions" on public.questions
  for select to anon, authenticated using (status = 'approved');

create table public.concept_lessons (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references public.concepts(id) on delete cascade,
  lang text not null default 'en' check (lang in ('en','sw')),
  summary text not null,
  key_points jsonb not null,
  exam_traps jsonb not null,
  remember text not null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (concept_id, lang)
);

alter table public.concept_lessons enable row level security;
create policy "read lessons" on public.concept_lessons
  for select to anon, authenticated using (true);

update public.skill_areas set learn_url = 'https://learn.microsoft.com/training/paths/azure-fundamentals/' where id = 'cloud_concepts';
update public.skill_areas set learn_url = 'https://learn.microsoft.com/training/paths/azure-fundamentals-describe-azure-architecture-services/' where id = 'architecture_services';
update public.skill_areas set learn_url = 'https://learn.microsoft.com/training/paths/azure-fundamentals-describe-azure-management-governance/' where id = 'management_governance';

update public.concepts set skill_area_id = 'architecture_services' where id = 'rbac';