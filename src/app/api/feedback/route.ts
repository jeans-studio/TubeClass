import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const category = String(body?.category ?? '').trim()
  const content = String(body?.content ?? '').trim()

  if (!category || !content) {
    return NextResponse.json({ error: '카테고리와 내용을 입력하세요' }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: '내용은 2000자 이하로 입력하세요' }, { status: 400 })
  }

  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인 후 피드백을 남길 수 있습니다' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('feedbacks')
    .insert({
      category,
      content,
      author_user_id: user.id,
      author_email: user.email ?? null,
      status: 'new',
    })

  if (error) {
    const message = error.code === 'PGRST205'
      ? 'DB에 public.feedbacks 테이블이 없습니다. Supabase SQL Editor에서 supabase/feedback_migration.sql을 실행해 주세요.'
      : error.message

    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
