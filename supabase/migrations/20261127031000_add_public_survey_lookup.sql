create or replace function private.get_public_impact_survey(p_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'category', s.category,
    'ends_at', s.ends_at,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'prompt', q.prompt,
        'question_type', q.question_type,
        'options', q.options,
        'is_required', q.is_required,
        'position', q.position
      ) order by q.position)
      from public.impact_survey_questions q
      where q.survey_id = s.id
    ), '[]'::jsonb)
  )
  from public.impact_surveys s
  where s.public_token = p_token
    and s.status = 'published'
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and exists (select 1 from public.impact_survey_questions q where q.survey_id = s.id);
$function$;

revoke all on function private.get_public_impact_survey(uuid) from public;
grant execute on function private.get_public_impact_survey(uuid) to anon, authenticated;

create or replace function public.get_public_impact_survey(p_token uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.get_public_impact_survey(p_token);
$function$;

revoke all on function public.get_public_impact_survey(uuid) from public;
grant execute on function public.get_public_impact_survey(uuid) to anon, authenticated;