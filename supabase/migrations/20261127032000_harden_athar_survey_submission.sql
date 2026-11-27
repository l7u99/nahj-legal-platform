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
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid answers payload';
  end if;
  if jsonb_object_length(p_answers) > 50 then
    raise exception 'Too many answers';
  end if;
  select * into v_survey from public.impact_surveys s
  where s.public_token = p_token and s.status = 'published'
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now());
  if not found then raise exception 'Survey is not available'; end if;
  if not exists (select 1 from public.impact_survey_questions q where q.survey_id = v_survey.id) then
    raise exception 'Survey has no questions';
  end if;
  for v_answer in select key, value from jsonb_each(p_answers) loop
    begin v_question_id := v_answer.key::uuid;
    exception when others then raise exception 'Invalid question reference'; end;
    select * into v_question from public.impact_survey_questions q
    where q.id = v_question_id and q.survey_id = v_survey.id;
    if not found then raise exception 'Unknown question'; end if;
    if v_question.question_type = 'rating' then
      if jsonb_typeof(v_answer.value) <> 'number' or (v_answer.value #>> '{}') !~ '^[1-5]$' then raise exception 'Invalid rating answer'; end if;
    elsif v_question.question_type = 'choice' then
      if jsonb_typeof(v_answer.value) <> 'string' or not (v_question.options @> jsonb_build_array(v_answer.value)) then raise exception 'Invalid choice answer'; end if;
    elsif v_question.question_type = 'text' then
      if jsonb_typeof(v_answer.value) <> 'string' or char_length(v_answer.value #>> '{}') > 2000 then raise exception 'Invalid text answer'; end if;
    end if;
  end loop;
  if exists (select 1 from public.impact_survey_questions q where q.survey_id = v_survey.id and q.is_required and not (p_answers ? q.id::text)) then
    raise exception 'Required answers are missing';
  end if;
  insert into public.impact_survey_responses(survey_id, answers) values (v_survey.id, p_answers) returning id into v_response_id;
  return v_response_id;
end;
$function$;