create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concept_id text not null references public.concepts(id) on delete cascade,
  score int not null default 0,
  max_score int not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

alter table public.lesson_progress enable row level security;

create policy "progress select own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy "progress insert own" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "progress update own" on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

update public.concepts set sort_order = v.o
from (values
  ('cloud-models', 101), ('consumption-capex-opex', 102), ('high-availability', 103),
  ('scalability-elasticity', 104), ('iaas', 105), ('paas', 106), ('saas', 107),
  ('serverless', 108), ('shared-responsibility', 109),
  ('regions', 201), ('region-pairs', 202), ('availability-zones', 203), ('resource-groups', 204),
  ('subscriptions-management-groups', 205), ('virtual-machines', 206),
  ('scale-sets-availability-sets', 207), ('containers', 208), ('app-service', 209),
  ('azure-functions', 210), ('virtual-network', 211), ('vpn-expressroute', 212),
  ('dns-endpoints', 213), ('storage-services', 214), ('storage-redundancy', 215),
  ('access-tiers', 216), ('data-movement', 217), ('entra-id', 218), ('auth-sso-mfa', 219),
  ('conditional-access', 220), ('rbac', 221), ('zero-trust-defence', 222),
  ('defender-for-cloud', 223),
  ('cost-factors', 301), ('pricing-tco-calculators', 302), ('cost-management-tags', 303),
  ('sla-lifecycle', 304), ('azure-policy', 305), ('resource-locks', 306), ('purview', 307),
  ('portal-cloud-shell', 308), ('cli-powershell', 309), ('arm-bicep', 310), ('azure-arc', 311),
  ('azure-advisor', 312), ('service-health', 313), ('azure-monitor', 314)
) as v(id, o)
where public.concepts.id = v.id;