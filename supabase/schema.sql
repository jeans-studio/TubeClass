-- TubeClass Supabase Schema
-- Run this in Supabase SQL Editor

-- 1. 대카테고리
create table if not exists public.main_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 소카테고리
create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  main_category_id uuid not null references public.main_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  thumbnail_url text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_category_id, slug)
);

-- 3. 재생목록
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references public.sub_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sub_category_id, slug)
);

-- 4. 영상
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references public.sub_categories(id) on delete cascade,
  playlist_id uuid references public.playlists(id) on delete cascade,
  title text not null,
  description text,
  youtube_url text not null,
  youtube_id text not null,
  thumbnail_url text,
  duration text,
  youtube_published_at date,
  youtube_channel_name text,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

alter table public.videos
  add column if not exists youtube_published_at date;

alter table public.videos
  add column if not exists youtube_channel_name text;

alter table public.videos
  add column if not exists difficulty text not null default 'beginner';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'videos_difficulty_check'
      and conrelid = 'public.videos'::regclass
  ) then
    alter table public.videos
      add constraint videos_difficulty_check
      check (difficulty in ('beginner', 'intermediate', 'advanced'));
  end if;
end;
$$;

-- 기존 직접 등록 영상을 소카테고리별 기본 재생목록으로 이관
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

-- 5. 최근 본 영상
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique(user_id, video_id)
);

-- 6. 학습 상태
create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  status text not null default 'learning' check (status in ('learning', 'completed')),
  updated_at timestamptz not null default now(),
  unique(user_id, video_id)
);

-- 7. 사용자 프로필
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 함수
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_main_categories_updated on public.main_categories;
create trigger on_main_categories_updated
  before update on public.main_categories
  for each row execute function public.handle_updated_at();

drop trigger if exists on_sub_categories_updated on public.sub_categories;
create trigger on_sub_categories_updated
  before update on public.sub_categories
  for each row execute function public.handle_updated_at();

drop trigger if exists on_playlists_updated on public.playlists;
create trigger on_playlists_updated
  before update on public.playlists
  for each row execute function public.handle_updated_at();

drop trigger if exists on_videos_updated on public.videos;
create trigger on_videos_updated
  before update on public.videos
  for each row execute function public.handle_updated_at();

drop trigger if exists on_video_progress_updated on public.video_progress;
create trigger on_video_progress_updated
  before update on public.video_progress
  for each row execute function public.handle_updated_at();

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 신규 사용자 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS 정책에서 관리자 여부를 확인할 때 profiles를 직접 조회하면
-- profiles 정책 평가 중 다시 profiles를 조회하는 재귀가 발생할 수 있다.
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

-- RLS 활성화
alter table public.main_categories enable row level security;
alter table public.sub_categories enable row level security;
alter table public.playlists enable row level security;
alter table public.videos enable row level security;
alter table public.watch_history enable row level security;
alter table public.video_progress enable row level security;
alter table public.profiles enable row level security;

-- main_categories: 모든 사용자 읽기, 관리자만 쓰기
drop policy if exists "main_categories_read" on public.main_categories;
create policy "main_categories_read" on public.main_categories
  for select using (true);

drop policy if exists "main_categories_admin_write" on public.main_categories;
create policy "main_categories_admin_write" on public.main_categories
  for all using (public.is_admin());

-- sub_categories
drop policy if exists "sub_categories_read" on public.sub_categories;
create policy "sub_categories_read" on public.sub_categories
  for select using (true);

drop policy if exists "sub_categories_admin_write" on public.sub_categories;
create policy "sub_categories_admin_write" on public.sub_categories
  for all using (public.is_admin());

-- playlists
drop policy if exists "playlists_read_published" on public.playlists;
create policy "playlists_read_published" on public.playlists
  for select using (is_published = true);

drop policy if exists "playlists_admin_all" on public.playlists;
create policy "playlists_admin_all" on public.playlists
  for all using (public.is_admin());

-- videos
drop policy if exists "videos_read_published" on public.videos;
create policy "videos_read_published" on public.videos
  for select using (is_published = true);

drop policy if exists "videos_admin_all" on public.videos;
create policy "videos_admin_all" on public.videos
  for all using (public.is_admin());

-- watch_history: 본인 데이터만
drop policy if exists "watch_history_own" on public.watch_history;
create policy "watch_history_own" on public.watch_history
  for all using (user_id = auth.uid());

-- video_progress: 본인 데이터만
drop policy if exists "video_progress_own" on public.video_progress;
create policy "video_progress_own" on public.video_progress
  for all using (user_id = auth.uid());

-- profiles: 본인 읽기/수정, 관리자 전체 읽기
drop policy if exists "profiles_own_read" on public.profiles;
create policy "profiles_own_read" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select using (public.is_admin());

-- 초기 데이터: 대카테고리
insert into public.main_categories (name, slug, description, sort_order) values
  ('언어', 'language', '외국어 학습 강의', 1),
  ('AI', 'ai', '인공지능 관련 강의', 2)
on conflict (slug) do nothing;

-- 초기 데이터: 소카테고리 - 언어
insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, '영어', 'english', 1 from public.main_categories where slug = 'language'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, '일본어', 'japanese', 2 from public.main_categories where slug = 'language'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, '중국어', 'chinese', 3 from public.main_categories where slug = 'language'
on conflict (main_category_id, slug) do nothing;

-- 초기 데이터: 소카테고리 - AI
insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, 'AI기초', 'ai-basics', 1 from public.main_categories where slug = 'ai'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, '프롬프트엔지니어링', 'prompt-engineering', 2 from public.main_categories where slug = 'ai'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, 'AI툴활용', 'ai-tools', 3 from public.main_categories where slug = 'ai'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, '머신러닝·딥러닝', 'ml-dl', 4 from public.main_categories where slug = 'ai'
on conflict (main_category_id, slug) do nothing;

insert into public.sub_categories (main_category_id, name, slug, sort_order)
select id, 'AI트렌드', 'ai-trends', 5 from public.main_categories where slug = 'ai'
on conflict (main_category_id, slug) do nothing;
