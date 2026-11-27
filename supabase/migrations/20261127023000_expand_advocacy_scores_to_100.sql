alter table public.advocacy_submissions
  drop constraint if exists advocacy_submissions_ai_score_check,
  drop constraint if exists advocacy_submissions_total_score_check;

alter table public.advocacy_submissions
  add constraint advocacy_submissions_ai_score_check
    check (ai_score is null or (ai_score >= 0 and ai_score <= 100)),
  add constraint advocacy_submissions_total_score_check
    check (total_score is null or (total_score >= 0 and total_score <= 100));

comment on column public.advocacy_submissions.ai_score is
  'Automated advocacy rubric score out of 100, based on five criteria worth 20 points each.';
comment on column public.advocacy_submissions.total_score is
  'Final AI rubric score out of 100; null until automated evaluation succeeds.';
