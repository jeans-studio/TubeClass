'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Feedback } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface FeedbackTableProps {
  feedbacks: Feedback[]
}

const statusLabels: Record<Feedback['status'], string> = {
  new: '새 피드백',
  reviewing: '검토중',
  resolved: '반영됨',
  deferred: '보류',
}

const statusVariants: Record<Feedback['status'], 'default' | 'secondary' | 'outline'> = {
  new: 'default',
  reviewing: 'secondary',
  resolved: 'outline',
  deferred: 'outline',
}

export function FeedbackTable({ feedbacks: initialFeedbacks }: FeedbackTableProps) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  const categories = useMemo(
    () => Array.from(new Set(feedbacks.map((feedback) => feedback.category))).sort((a, b) => a.localeCompare(b, 'ko')),
    [feedbacks]
  )

  const filteredFeedbacks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return feedbacks.filter((feedback) => {
      const matchSearch = !query ||
        [feedback.category, feedback.content, feedback.author_email]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query))
      const matchCategory = category === 'all' || feedback.category === category
      const matchStatus = status === 'all' || feedback.status === status

      return matchSearch && matchCategory && matchStatus
    })
  }, [feedbacks, search, category, status])

  async function updateStatus(id: string, nextStatus: Feedback['status']) {
    const previousFeedbacks = feedbacks
    setFeedbacks((items) =>
      items.map((item) => item.id === id ? { ...item, status: nextStatus } : item)
    )

    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? '피드백 상태 변경에 실패했습니다')
      }

      setFeedbacks((items) =>
        items.map((item) => item.id === id ? result.feedback : item)
      )
      toast.success('상태를 변경했습니다')
    } catch (error) {
      setFeedbacks(previousFeedbacks)
      toast.error(error instanceof Error ? error.message : '피드백 상태 변경에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="내용, 카테고리, 작성자 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue>{category === 'all' ? '카테고리 전체' : category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">카테고리 전체</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue>{status === 'all' ? '상태 전체' : statusLabels[status as Feedback['status']]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">상태 전체</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">카테고리</TableHead>
              <TableHead>내용</TableHead>
              <TableHead className="w-48">작성자</TableHead>
              <TableHead className="w-40">작성일</TableHead>
              <TableHead className="w-36">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  피드백이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <Badge variant="secondary">{feedback.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{feedback.content}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {feedback.author_email ?? '비로그인'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={feedback.status}
                      onValueChange={(value) => updateStatus(feedback.id, value as Feedback['status'])}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue>
                          <Badge variant={statusVariants[feedback.status]} className="text-xs">
                            {statusLabels[feedback.status]}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
