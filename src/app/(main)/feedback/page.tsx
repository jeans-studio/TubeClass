import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MessageSquareText } from 'lucide-react'
import { FeedbackForm } from './FeedbackForm'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '피드백 | TubeClass',
  description: 'TubeClass 피드백',
}

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/dashboard')
  }

  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <MessageSquareText className="h-3.5 w-3.5" />
          Feedback
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">피드백</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            콘텐츠 제안, 오류, 사용성 개선 의견 등 TubeClass 운영에 필요한 의견을 남겨주세요.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <FeedbackForm />
      </section>
    </div>
  )
}
