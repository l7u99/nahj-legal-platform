alter table public.impact_assessments
  drop constraint if exists impact_assessments_portal_check;

alter table public.impact_assessments
  add constraint impact_assessments_portal_check
  check (portal in ('meetings', 'partners', 'teams', 'general'));
