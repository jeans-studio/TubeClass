'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const feedbackCategories = [
  '콘텐츠 제안',
  '콘텐츠 문제',
  '기능 제안',
  '오류 신고',
  '사용성 의견',
  '기타',
]

export function FeedbackForm() {
  const [category, setCategory] = useState(feedbackCategories[0])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      toast.error('내용을 입력하세요')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: trimmedContent }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? '피드백 저장에 실패했습니다')
      }

      setCategory(feedbackCategories[0])
      setContent('')
      toast.success('피드백을 남겼습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '피드백 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="feedback-category">카테고리</Label>
        <select
          id="feedback-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {feedbackCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-content">내용</Label>
        <Textarea
          id="feedback-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={8}
          maxLength={2000}
          placeholder="제안, 오류, 콘텐츠 문제, 개선 의견 등을 자유롭게 남겨주세요."
        />
        <p className="text-xs text-muted-foreground">{content.length}/2000</p>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        보내기
      </Button>
    </form>
  )
}
