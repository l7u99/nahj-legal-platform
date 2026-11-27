alter table public.impact_survey_questions
  add column if not exists dimension text not null default 'operational'
  check (dimension in ('institutional','operational','knowledge','partnerships','development'));

comment on column public.impact_survey_questions.dimension is
  'Sustainability dimension used for aggregated impact scorecards.';