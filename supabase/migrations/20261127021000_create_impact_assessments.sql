create table if not exists public.impact_assessments (
  id uuid primary key default gen_random_uuid(),
  portal text not null check (portal in ('meetings', 'partners', 'teams')),
  title text not null check (char_length(title) between 2 and 180),
  report jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists impact_assessments_portal_created_at_idx
  on public.impact_assessments (portal, created_at desc);

create index if not exists impact_assessments_status_created_at_idx
  on public.impact_assessments (status, created_at desc);

alter table public.impact_assessments enable row level security;

revoke all on public.impact_assessments from anon;
grant select, insert, update, delete on public.impact_assessments to authenticated;

drop policy if exists "Active admins manage impact assessments" on public.impact_assessments;
create policy "Active admins manage impact assessments"
  on public.impact_assessments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.impact_assessments is
  'Saved impact assessment reports for Nahj Legal portal. Only active admins may access these records.';
