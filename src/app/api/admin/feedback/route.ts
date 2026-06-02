import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const statuses = ['new', 'reviewing', 'resolved', 'deferred'] as const

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabaseAdmin = createAdminClient()
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabaseAdmin }
}

function feedbackTableMessage(error: { code?: string; message?: string } | null) {
  if (error?.code === 'PGRST205') {
    return 'DB에 public.feedbacks 테이블이 없습니다. Supabase SQL Editor에서 supabase/feedback_migration.sql을 실행해 주세요.'
  }

  if (error?.code === 'PGRST204') {
    return 'DB의 public.feedbacks 스키마가 최신이 아닙니다. Supabase SQL Editor에서 supabase/feedback_migration.sql을 다시 실행해 주세요.'
  }

  return error?.message ?? '피드백 작업에 실패했습니다'
}

export async function GET() {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const { data, error: queryError } = await supabaseAdmin
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  if (queryError) {
    return NextResponse.json({ error: feedbackTableMessage(queryError) }, { status: 400 })
  }

  return NextResponse.json({ feedbacks: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  const status = String(body?.status ?? '')

  if (!id || !statuses.includes(status as (typeof statuses)[number])) {
    return NextResponse.json({ error: 'Invalid feedback update' }, { status: 400 })
  }

  const { data, error: queryError } = await supabaseAdmin
    .from('feedbacks')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (queryError) {
    return NextResponse.json({ error: feedbackTableMessage(queryError) }, { status: 400 })
  }

  return NextResponse.json({ feedback: data })
}
