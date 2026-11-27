-- Harden public-facing views by making them honor underlying table RLS.
-- Keep the public archive and published quiz experience working without exposing drafts or participant PII.

-- Archived question sets and their questions are intentionally readable in the public archive.
drop policy if exists "archived sets public read" on public.question_sets;
create policy "archived sets public read"
  on public.question_sets
  for select
  to anon, authenticated
  using (status = 'archived' or public.is_admin());

drop policy if exists "archived questions public read" on public.questions;
create policy "archived questions public read"
  on public.questions
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.question_sets s
      where s.id = questions.set_id
        and s.status in ('published', 'archived')
    )
  );

-- Options are public only when their parent question set is published or archived.
drop policy if exists "published and archived options public read" on public.options;
create policy "published and archived options public read"
  on public.options
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.questions q
      join public.question_sets s on s.id = q.set_id
      where q.id = options.question_id
        and s.status in ('published', 'archived')
    )
  );

-- The public API role needs read-only base-table privileges for invoker-security views.
revoke all on public.question_sets, public.questions, public.options from anon;
grant select on public.question_sets, public.questions, public.options to anon;

-- PostgreSQL 15+ security_invoker ensures the caller's RLS policies apply to view rows.
alter view public.archived_question_answers set (security_invoker = true, security_barrier = true);
alter view public.public_options set (security_invoker = true, security_barrier = true);
alter view public.weekly_leaderboard_full set (security_invoker = true, security_barrier = true);

-- These views are read-only API surfaces. Never grant write privileges on a view to public roles.
revoke all on public.archived_question_answers from anon, authenticated;
revoke all on public.public_options from anon, authenticated;
revoke all on public.weekly_leaderboard_full from anon, authenticated;

grant select on public.archived_question_answers to anon, authenticated;
grant select on public.public_options to anon, authenticated;

-- The unmasked full-name leaderboard is not used by the current application and exposes participant PII.
-- Keep the object for compatibility, but make it inaccessible to public and regular authenticated users.
