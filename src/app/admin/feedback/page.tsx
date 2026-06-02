import { createAdminClient } from '@/lib/supabase/admin'
import { FeedbackTable } from './FeedbackTable'
import type { Feedback } from '@/types'

function migrationMessage(error: { code?: string; message?: string } | null) {
  if (error?.code === 'PGRST205') {
    return 'DB에 public.feedbacks 테이블이 없습니다. Supabase SQL Editor에서 supabase/feedback_migration.sql을 실행해 주세요.'
  }

  if (error?.code === 'PGRST204') {
    return 'DB의 public.feedbacks 스키마가 최신이 아닙니다. Supabase SQL Editor에서 supabase/feedback_migration.sql을 다시 실행해 주세요.'
  }

  return error?.message ?? null
}

export default async function AdminFeedbackPage() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })

  const feedbacks = (data ?? []) as Feedback[]
  const message = migrationMessage(error)
  const newCount = feedbacks.filter((feedback) => feedback.status === 'new').length

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">피드백 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 {feedbacks.length.toLocaleString('ko-KR')}개 · 새 피드백 {newCount.toLocaleString('ko-KR')}개
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {message}
        </div>
      ) : (
        <FeedbackTable feedbacks={feedbacks} />
      )}
    </div>
  )
}
