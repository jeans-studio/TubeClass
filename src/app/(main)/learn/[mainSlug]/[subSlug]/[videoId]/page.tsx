import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, ListVideo, PlayCircle } from 'lucide-react'
import type { Playlist, Video, VideoProgress } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string; videoId: string }>
}

const difficultyLabels: Record<Playlist['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function playlistDifficulty(value: unknown): Playlist['difficulty'] {
  return value === 'intermediate' || value === 'advanced' ? value : 'beginner'
}

export default async function PlaylistPage({ params }: PageProps) {
  const { mainSlug, subSlug, videoId } = await params
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
      ? supabase.from('video_progress').select('*').eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  if (!playlist) notFound()

  const videos: Video[] = (playlist.videos ?? []).filter((video: Video) => video.is_published)
  const progressItems = (progress ?? []) as VideoProgress[]

  return (
    <div className="w-full p-4 md:p-6">
      <nav className="mb-4 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm text-muted-foreground">
        <Link href="/dashboard" className="shrink-0 hover:text-foreground">홈</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/learn/${mainSlug}`} className="block max-w-[18vw] shrink-0 truncate hover:text-foreground sm:max-w-24 md:max-w-36">
          {playlist.sub_category?.main_category?.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/learn/${mainSlug}/${subSlug}`} className="block max-w-[24vw] shrink-0 truncate hover:text-foreground sm:max-w-28 md:max-w-40">
          {playlist.sub_category?.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="block min-w-0 flex-1 truncate font-medium text-foreground">{playlist.name}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ListVideo className="h-3.5 w-3.5" />
            {difficultyLabels[playlistDifficulty(playlist.difficulty)]} 재생목록
          </div>
          <h1 className="line-clamp-2 text-xl font-semibold text-foreground">{playlist.name}</h1>
          {playlist.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{playlist.description}</p>}
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{videos.length}개 강의</span>
      </div>

      {videos.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <PlayCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>등록된 강의가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((video, idx) => {
            const prog = progressItems.find((item) => item.video_id === video.id)

            return (
              <Link key={video.id} href={`/learn/${mainSlug}/${subSlug}/${playlistSlug}/${video.id}`}>
                <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <PlayCircle className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                      {idx + 1}
                    </div>
                    {prog && (
                      <div className="absolute right-2 top-2">
                        <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'} className="py-0 text-xs">
                          {prog.status === 'completed' ? '완료' : '학습중'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="px-3 py-3">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{video.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {video.duration && <span>{video.duration}</span>}
                      {video.youtube_channel_name && <span>출처 {video.youtube_channel_name}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
