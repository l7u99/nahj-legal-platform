create table if not exists public.impact_ai_usage (
  month_start date primary key,
  request_count integer not null default 0 check (request_count >= 0),
  estimated_input_tokens bigint not null default 0 check (estimated_input_tokens >= 0),
  actual_input_tokens bigint not null default 0 check (actual_input_tokens >= 0),
  actual_output_tokens bigint not null default 0 check (actual_output_tokens >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.impact_ai_usage enable row level security;
revoke all on public.impact_ai_usage from anon, authenticated;
grant all on public.impact_ai_usage to service_role;

create or replace function public.reserve_impact_ai_request(
  p_monthly_limit integer,
  p_estimated_input_tokens integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'UTC'))::date;
begin
  if p_monthly_limit is null or p_monthly_limit < 1 then return false; end if;
  insert into public.impact_ai_usage(month_start,request_count,estimated_input_tokens,updated_at)
  values(v_month,1,greatest(coalesce(p_estimated_input_tokens,0),0),now())
  on conflict(month_start) do update
    set request_count=public.impact_ai_usage.request_count+1,
        estimated_input_tokens=public.impact_ai_usage.estimated_input_tokens+greatest(coalesce(p_estimated_input_tokens,0),0),
        updated_at=now()
    where public.impact_ai_usage.request_count < p_monthly_limit;
  return found;
end;
$$;

create or replace function public.record_impact_ai_usage(
  p_actual_input_tokens integer,
  p_actual_output_tokens integer,
  p_failed boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.impact_ai_usage
  set actual_input_tokens=actual_input_tokens+greatest(coalesce(p_actual_input_tokens,0),0),
      actual_output_tokens=actual_output_tokens+greatest(coalesce(p_actual_output_tokens,0),0),
      failed_count=failed_count+case when coalesce(p_failed,false) then 1 else 0 end,
      updated_at=now()
  where month_start=(date_trunc('month',now() at time zone 'UTC'))::date;
$$;

revoke all on function public.reserve_impact_ai_request(integer,integer) from public,anon,authenticated;
revoke all on function public.record_impact_ai_usage(integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.reserve_impact_ai_request(integer,integer) to service_role;
grant execute on function public.record_impact_ai_usage(integer,integer,boolean) to service_role;

comment on table public.impact_ai_usage is
  'Monthly aggregate usage counters for the public on-demand impact assistant. No conversation content is stored.';
