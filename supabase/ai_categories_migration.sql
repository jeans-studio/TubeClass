-- Reset initial categories to the focused AI learning structure.
-- This removes language/hobby categories and keeps AI Development / AI Usage only.

do $$
declare
  ai_development_id uuid;
  ai_usage_id uuid;
  old_ai_id uuid;
begin
  select id into old_ai_id from public.main_categories where slug = 'ai' limit 1;
  select id into ai_development_id from public.main_categories where slug = 'ai-development' limit 1;

  if ai_development_id is null and old_ai_id is not null then
    update public.main_categories
    set
      name = 'AI 개발',
      slug = 'ai-development',
      description = 'AI 도구로 웹/앱/서비스를 만드는 학습',
      sort_order = 1
    where id = old_ai_id
    returning id into ai_development_id;
  elsif ai_development_id is null then
    insert into public.main_categories (name, slug, description, sort_order)
    values ('AI 개발', 'ai-development', 'AI 도구로 웹/앱/서비스를 만드는 학습', 1)
    returning id into ai_development_id;
  else
    update public.main_categories
    set name = 'AI 개발',
        description = 'AI 도구로 웹/앱/서비스를 만드는 학습',
        sort_order = 1
    where id = ai_development_id;
  end if;

  insert into public.main_categories (name, slug, description, sort_order)
  values ('AI 활용', 'ai-usage', '업무와 콘텐츠 제작에 AI를 활용하는 학습', 2)
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order
  returning id into ai_usage_id;

  update public.sub_categories
  set name = 'Git/GitHub', slug = 'git-github', sort_order = 1, main_category_id = ai_development_id
  where main_category_id = ai_development_id and slug in ('git-github', 'github');

  update public.sub_categories
  set name = 'Claude Code', slug = 'claude-code', sort_order = 2, main_category_id = ai_development_id
  where main_category_id = ai_development_id and slug in ('claude', 'claude-code');

  update public.sub_categories
  set name = 'Codex', slug = 'codex', sort_order = 3, main_category_id = ai_development_id
  where main_category_id = ai_development_id and slug in ('gptcodex', 'codex');

  insert into public.sub_categories (main_category_id, name, slug, sort_order)
  values
    (ai_development_id, 'Git/GitHub', 'git-github', 1),
    (ai_development_id, 'Claude Code', 'claude-code', 2),
    (ai_development_id, 'Codex', 'codex', 3),
    (ai_development_id, 'Vibe Coding', 'vibe-coding', 4),
    (ai_development_id, 'Vibe Design', 'vibe-design', 5)
  on conflict (main_category_id, slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order;

  update public.sub_categories
  set name = '이미지/영상 생성', slug = 'image-video-generation', sort_order = 2, main_category_id = ai_usage_id
  where slug in ('imagevideo', 'image-video', 'image-video-generation');

  insert into public.sub_categories (main_category_id, name, slug, sort_order)
  values
    (ai_usage_id, '업무 자동화', 'workflow-automation', 1),
    (ai_usage_id, '이미지/영상 생성', 'image-video-generation', 2),
    (ai_usage_id, '마케팅 콘텐츠', 'marketing-content', 3)
  on conflict (main_category_id, slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order;

  delete from public.sub_categories
  where main_category_id = ai_development_id
    and slug not in ('git-github', 'claude-code', 'codex', 'vibe-coding', 'vibe-design');

  delete from public.sub_categories
  where main_category_id = ai_usage_id
    and slug not in ('workflow-automation', 'image-video-generation', 'marketing-content');

  delete from public.main_categories
  where slug in ('language', 'hobby', 'ai')
     or name in ('언어', '취미');
end;
$$;
