-- Add feedback collection table for in-app feedback management.

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  content text not null,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_email text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedbacks
  add column if not exists author_user_id uuid references public.profiles(id) on delete set null;

alter table public.feedbacks
  add column if not exists author_email text;

alter table public.feedbacks
  add column if not exists status text not null default 'new';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feedbacks_status_check'
      and conrelid = 'public.feedbacks'::regclass
  ) then
    alter table public.feedbacks
      add constraint feedbacks_status_check
      check (status in ('new', 'reviewing', 'resolved', 'deferred'));
  end if;
end;
$$;

drop trigger if exists on_feedbacks_updated on public.feedbacks;
create trigger on_feedbacks_updated
  before update on public.feedbacks
  for each row execute function public.handle_updated_at();

create index if not exists feedbacks_status_created_at_idx
  on public.feedbacks(status, created_at desc);

alter table public.feedbacks enable row level security;

drop policy if exists "feedbacks_admin_all" on public.feedbacks;
create policy "feedbacks_admin_all" on public.feedbacks
  for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
