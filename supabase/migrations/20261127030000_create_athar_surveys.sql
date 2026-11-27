-- Athar surveys: private team workspace with a public, token-based response endpoint.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.impact_surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 180),
  description text not null default '',
  category text not null default 'general' check (category in ('meetings','partners','teams','general')),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  public_token uuid not null default gen_random_uuid() unique,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.impact_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.impact_surveys(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 2 and 500),
  question_type text not null check (question_type in ('rating','choice','text')),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  is_required boolean not null default true,
  dimension text not null default 'operational' check (dimension in ('institutional','operational','knowledge','partnerships','development')),
  position smallint not null default 1 check (position > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.impact_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.impact_surveys(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz not null default now()
);

create index if not exists impact_surveys_status_created_idx on public.impact_surveys(status, created_at desc);
create index if not exists impact_survey_questions_survey_position_idx on public.impact_survey_questions(survey_id, position);
create index if not exists impact_survey_responses_survey_submitted_idx on public.impact_survey_responses(survey_id, submitted_at desc);

alter table public.impact_surveys enable row level security;
alter table public.impact_survey_questions enable row level security;
alter table public.impact_survey_responses enable row level security;

revoke all on public.impact_surveys, public.impact_survey_questions, public.impact_survey_responses from anon, authenticated;
grant select, insert, update, delete on public.impact_surveys, public.impact_survey_questions to authenticated;
grant select on public.impact_survey_responses to authenticated;

drop policy if exists "Active impact members manage surveys" on public.impact_surveys;
create policy "Active impact members manage surveys" on public.impact_surveys
for all to authenticated
using (public.is_active_impact_member())
with check (public.is_active_impact_member() and created_by = (select auth.uid()));

drop policy if exists "Active impact members manage survey questions" on public.impact_survey_questions;
create policy "Active impact members manage survey questions" on public.impact_survey_questions
for all to authenticated
using (public.is_active_impact_member())
with check (public.is_active_impact_member());

drop policy if exists "Active impact members read survey responses" on public.impact_survey_responses;
create policy "Active impact members read survey responses" on public.impact_survey_responses
for select to authenticated
using (public.is_active_impact_member());

create or replace function private.submit_impact_survey(p_token uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_survey public.impact_surveys%rowtype;
  v_question public.impact_survey_questions%rowtype;
  v_answer record;
  v_question_id uuid;
  v_response_id uuid;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or jsonb_object_length(p_answers) > 50 then
    raise exception 'Invalid answers payload';
  end if;

  select * into v_survey
  from public.impact_surveys s
  where s.public_token = p_token
    and s.status = 'published'
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now());

  if not found then
    raise exception 'Survey is not available';
  end if;

  if not exists (select 1 from public.impact_survey_questions q where q.survey_id = v_survey.id) then
    raise exception 'Survey has no questions';
  end if;

  for v_answer in select key, value from jsonb_each(p_answers)
  loop
    begin
      v_question_id := v_answer.key::uuid;
    exception when others then
      raise exception 'Invalid question reference';
    end;

    select * into v_question
    from public.impact_survey_questions q
    where q.id = v_question_id and q.survey_id = v_survey.id;

    if not found then
      raise exception 'Unknown question';
    end if;

    if v_question.question_type = 'rating' then
      if jsonb_typeof(v_answer.value) <> 'number' or (v_answer.value #>> '{}') !~ '^[1-5]$' then
        raise exception 'Invalid rating answer';
      end if;
    elsif v_question.question_type = 'choice' then
      if jsonb_typeof(v_answer.value) <> 'string' or not (v_question.options @> jsonb_build_array(v_answer.value)) then
        raise exception 'Invalid choice answer';
      end if;
    elsif v_question.question_type = 'text' then
      if jsonb_typeof(v_answer.value) <> 'string' or char_length(v_answer.value #>> '{}') > 2000 then
        raise exception 'Invalid text answer';
      end if;
    end if;
  end loop;

  if exists (
    select 1 from public.impact_survey_questions q
    where q.survey_id = v_survey.id and q.is_required
      and not (p_answers ? q.id::text)
  ) then
    raise exception 'Required answers are missing';
  end if;

  insert into public.impact_survey_responses(survey_id, answers)
  values (v_survey.id, p_answers)
  returning id into v_response_id;

  return v_response_id;
end;
$function$;

revoke all on function private.submit_impact_survey(uuid, jsonb) from public;
grant execute on function private.submit_impact_survey(uuid, jsonb) to anon, authenticated;

create or replace function public.submit_impact_survey(p_token uuid, p_answers jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.submit_impact_survey(p_token, p_answers);
$function$;

revoke all on function public.submit_impact_survey(uuid, jsonb) from public;
grant execute on function public.submit_impact_survey(uuid, jsonb) to anon, authenticated;
