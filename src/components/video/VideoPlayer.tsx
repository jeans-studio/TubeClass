'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getYouTubeEmbedUrl } from '@/lib/youtube'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface VideoPlayerProps {
  videoId: string
  youtubeId: string
  title: string
  initialStatus?: 'learning' | 'completed' | null
  userId?: string | null
}

export function VideoPlayer({ videoId, youtubeId, title, initialStatus, userId }: VideoPlayerProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'learning' | 'completed' | null>(initialStatus ?? null)
  const [saving, setSaving] = useState(false)

  // 시청 기록 저장 (로그인 상태일 때만)
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    supabase
      .from('watch_history')
      .upsert(
        { user_id: userId, video_id: videoId, watched_at: new Date().toISOString() },
        { onConflict: 'user_id,video_id' }
      )
      .then(() => {})
  }, [videoId, userId])

  async function updateStatus(newStatus: 'learning' | 'completed') {
    if (!userId) return
    setSaving(true)
    const supabase = createClient()

    if (status === newStatus) {
      const { error } = await supabase
        .from('video_progress')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId)

      if (error) {
        toast.error('저장 실패')
      } else {
        setStatus(null)
        toast.success('학습 상태를 해제했습니다')
        router.refresh()
      }
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('video_progress')
      .upsert(
        { user_id: userId, video_id: videoId, status: newStatus },
        { onConflict: 'user_id,video_id' }
      )

    if (error) {
      toast.error('저장 실패')
    } else {
      setStatus(newStatus)
      toast.success(newStatus === 'completed' ? '완료로 표시했습니다' : '학습중으로 표시했습니다')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* YouTube 임베드 */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
        <iframe
          src={getYouTubeEmbedUrl(youtubeId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* 학습 상태 버튼 — 로그인 시에만 표시 */}
      {userId ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">학습 상태:</span>
          {status && (
            <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
              {status === 'completed' ? '완료' : '학습중'}
            </Badge>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant={status === 'learning' ? 'default' : 'outline'}
              onClick={() => updateStatus('learning')}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              학습중
            </Button>
            <Button
              size="sm"
              variant={status === 'completed' ? 'default' : 'outline'}
              onClick={() => updateStatus('completed')}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              완료
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          학습 진도를 저장하려면{' '}
          <span className="font-medium text-foreground">Google로 로그인</span>하세요
        </p>
      )}
    </div>
  )
}
