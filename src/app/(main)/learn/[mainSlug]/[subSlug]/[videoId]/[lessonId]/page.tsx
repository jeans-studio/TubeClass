import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, PlayCircle } from 'lucide-react'
import type { Playlist, VideoProgress } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string; videoId: string; lessonId: string }>
}

const difficultyLabels: Record<Playlist['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function playlistDifficulty(value: unknown): Playlist['difficulty'] {
  return value === 'intermediate' || value === 'advanced' ? value : 'beginner'
}

export default async function VideoPage({ params }: PageProps) {
  const { mainSlug, subSlug, videoId, lessonId } = await params
  const playlistSlug = decodeURIComponent(videoId)
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: playlist }, { data: progress }] = await Promise.all([
    supabaseAdmin
      .from('playlists')
      .select('*, sub_category:sub_categories!inner(id, name, slug, main_category:main_categories!inner(id, name, slug)), videos(*, playlist_id)')
      .eq('slug', playlistSlug)
      .eq('is_published', true)
      .eq('sub_category.slug', subSlug)
      .eq('sub_category.main_category.slug', mainSlug)
      .order('sort_order', { referencedTable: 'videos' })
      .single(),
    user
      ? supabase
          .from('video_progress')
          .select('*')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  if (!playlist) notFound()

  const videos = (playlist.videos ?? []).filter((item: { is_published?: boolean }) => item.is_published)
  const video = videos.find((item: { id: string }) => item.id === lessonId)
  const progressItems = (progress ?? []) as VideoProgress[]
  const progressByVideoId = new Map(progressItems.map((item) => [item.video_id, item.status]))
  const currentProgressStatus = progressByVideoId.get(lessonId) ?? null

  if (!video) notFound()

  return (
    <div className="w-full p-4 md:p-6">
      <nav className="mb-4 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm text-muted-foreground">
        <Link href="/dashboard" className="shrink-0 hover:text-foreground">홈</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/learn/${mainSlug}/${subSlug}`} className="block max-w-[22vw] shrink-0 truncate hover:text-foreground sm:max-w-28 md:max-w-40">
          {playlist.sub_category?.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/learn/${mainSlug}/${subSlug}/${playlistSlug}`} className="block max-w-[32vw] shrink-0 truncate hover:text-foreground sm:max-w-48 md:max-w-72">
          {playlist.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="block min-w-0 flex-1 truncate font-medium text-foreground">{video.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="order-2 space-y-2 xl:order-1">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {playlist.name} ({videos.length}개)
          </h2>
          <div className="max-h-[calc(100vh-11rem)] space-y-2.5 overflow-y-auto pr-1">
            {videos.map((item: { id: string; title: string; thumbnail_url: string | null; sort_order: number; youtube_id: string; duration?: string | null }, idx: number) => {
              const isCurrent = item.id === lessonId
              const itemStatus = progressByVideoId.get(item.id)
              return (
                <Link key={item.id} href={`/learn/${mainSlug}/${subSlug}/${playlistSlug}/${item.id}`} className="block">
                  <Card className={`overflow-hidden border ring-0 transition-all ${isCurrent ? 'border-primary/70 bg-primary/5 shadow-sm' : 'hover:border-primary/30 hover:shadow-sm'}`}>
                    <CardContent className="flex gap-2.5 px-2 py-2.5">
                      <div className="flex w-4 shrink-0 justify-center pt-0.5 text-xs text-muted-foreground">
                        {idx + 1}
                      </div>
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-muted">
                        {item.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <PlayCircle className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`line-clamp-2 text-xs leading-snug ${isCurrent ? 'font-medium text-primary' : 'text-foreground'}`}>
                          {item.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {itemStatus && (
                            <Badge variant={itemStatus === 'completed' ? 'default' : 'secondary'} className="px-1.5 py-0 text-[10px]">
                              {itemStatus === 'completed' ? '완료' : '학습중'}
                            </Badge>
                          )}
                          {item.duration && <span className="text-xs text-muted-foreground">{item.duration}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </aside>

        <section className="order-1 min-w-0 space-y-4 xl:order-2">
          <VideoPlayer
            key={`${video.id}-${currentProgressStatus ?? 'none'}`}
            videoId={video.id}
            youtubeId={video.youtube_id}
            title={video.title}
            initialStatus={currentProgressStatus}
            userId={user?.id ?? null}
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {difficultyLabels[playlistDifficulty(playlist.difficulty)]}
              </Badge>
              {video.duration && (
                <span className="inline-flex items-center gap-1">
                  <PlayCircle className="h-4 w-4" />
                  {video.duration}
                </span>
              )}
              {video.youtube_channel_name && <span>출처 {video.youtube_channel_name}</span>}
            </div>
            {video.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{video.description}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
