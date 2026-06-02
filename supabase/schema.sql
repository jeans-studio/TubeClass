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
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_category_id, slug)
);

-- 3. 영상
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references public.sub_categories(id) on delete cascade,
  title text not null,
  description text,
  youtube_url text not null,
  youtube_id text not null,
  thumbnail_url text,
  duration text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. 최근 본 영상
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique(user_id, video_id)
);

-- 5. 학습 상태
create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  status text not null default 'learning' check (status in ('learning', 'completed')),
  updated_at timestamptz not null default now(),
  unique(user_id, video_id)
);

-- 6. 사용자 프로필
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

create trigger on_main_categories_updated
  before update on public.main_categories
  for each row execute function public.handle_updated_at();

create trigger on_sub_categories_updated
  before update on public.sub_categories
  for each row execute function public.handle_updated_at();

create trigger on_videos_updated
  before update on public.videos
  for each row execute function public.handle_updated_at();

create trigger on_video_progress_updated
  before update on public.video_progress
  for each row execute function public.handle_updated_at();

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS 활성화
alter table public.main_categories enable row level security;
alter table public.sub_categories enable row level security;
alter table public.videos enable row level security;
alter table public.watch_history enable row level security;
alter table public.video_progress enable row level security;
alter table public.profiles enable row level security;

-- main_categories: 모든 사용자 읽기, 관리자만 쓰기
create policy "main_categories_read" on public.main_categories
  for select using (true);

create policy "main_categories_admin_write" on public.main_categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- sub_categories
create policy "sub_categories_read" on public.sub_categories
  for select using (true);

create policy "sub_categories_admin_write" on public.sub_categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- videos
create policy "videos_read_published" on public.videos
  for select using (is_published = true);

create policy "videos_admin_all" on public.videos
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- watch_history: 본인 데이터만
create policy "watch_history_own" on public.watch_history
  for all using (user_id = auth.uid());

-- video_progress: 본인 데이터만
create policy "video_progress_own" on public.video_progress
  for all using (user_id = auth.uid());

-- profiles: 본인 읽기/수정, 관리자 전체 읽기
create policy "profiles_own_read" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_own_update" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_read" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

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
