-- Add playlist layer between sub_categories and videos.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references public.sub_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  thumbnail_url text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sub_category_id, slug)
);

alter table public.videos
  add column if not exists playlist_id uuid references public.playlists(id) on delete cascade;

alter table public.playlists
  add column if not exists difficulty text not null default 'beginner';

alter table public.playlists
  add column if not exists thumbnail_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'playlists_difficulty_check'
      and conrelid = 'public.playlists'::regclass
  ) then
    alter table public.playlists
      add constraint playlists_difficulty_check
      check (difficulty in ('beginner', 'intermediate', 'advanced'));
  end if;
end;
$$;

drop trigger if exists on_playlists_updated on public.playlists;
create trigger on_playlists_updated
  before update on public.playlists
  for each row execute function public.handle_updated_at();

insert into public.playlists (sub_category_id, name, slug, description, difficulty, sort_order, is_published)
select sc.id, '기본 재생목록', 'default', '기존에 직접 등록된 영상 모음', 'beginner', 1, true
from public.sub_categories sc
where exists (
  select 1
  from public.videos v
  where v.sub_category_id = sc.id
)
on conflict (sub_category_id, slug) do nothing;

update public.videos v
set playlist_id = p.id
from public.playlists p
where v.playlist_id is null
  and p.sub_category_id = v.sub_category_id
  and p.slug = 'default';

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.playlists enable row level security;

drop policy if exists "playlists_read_published" on public.playlists;
create policy "playlists_read_published" on public.playlists
  for select using (is_published = true);

drop policy if exists "playlists_admin_all" on public.playlists;
create policy "playlists_admin_all" on public.playlists
  for all using (public.is_admin());

notify pgrst, 'reload schema';
