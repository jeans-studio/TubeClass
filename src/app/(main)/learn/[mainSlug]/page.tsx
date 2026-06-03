import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, Clock, FolderOpen, ListVideo, PlayCircle } from 'lucide-react'
import { summarizePlaylistProgress, type ProgressStatus } from '@/lib/learning-progress'
import type { MainCategory, Playlist, Video, VideoProgress } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string }>
}

type CategoryVideo = Video & {
  subCategoryName: string
  subCategorySlug: string
  mainCategorySlug: string
  playlistSlug: string
  playlistDifficulty: Playlist['difficulty']
}

type CategoryPlaylist = Playlist & {
  subCategoryName: string
  subCategorySlug: string
  mainCategorySlug: string
  videos?: Video[]
}

type HistoryItem = {
  id: string
  watched_at: string
  video: Video & {
    playlist: { slug: string; difficulty: Playlist['difficulty'] } | null
    sub_category: {
      name: string
      slug: string
      main_category: {
        name: string
        slug: string
      }
    }
  }
}

const difficultyLabels: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export default async function MainCategoryPage({ params }: PageProps) {
  const { mainSlug } = await params
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: mainCategory }, { data: history }, { data: progress }] = await Promise.all([
    supabaseAdmin
      .from('main_categories')
      .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at, playlists(*, videos(*, playlist_id)))')
      .eq('slug', mainSlug)
      .order('sort_order', { referencedTable: 'sub_categories' })
      .order('sort_order', { referencedTable: 'sub_categories.playlists' })
      .single(),
    user
      ? supabase
          .from('watch_history')
          .select('*, video:videos(*, playlist:playlists(slug, difficulty), sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('video_progress')
          .select('video_id, status')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  if (!mainCategory) notFound()

  const category = mainCategory as MainCategory
  const subCategories = category.sub_categories ?? []
  const allPlaylists: CategoryPlaylist[] = subCategories.flatMap((sub) =>
    ((sub.playlists ?? []) as Playlist[])
      .filter((playlist) => playlist.is_published)
      .map((playlist) => ({
        ...playlist,
        videos: (playlist.videos ?? []).filter((video) => video.is_published),
        subCategoryName: sub.name,
        subCategorySlug: sub.slug,
        mainCategorySlug: category.slug,
      }))
  )
  const allVideosCount = allPlaylists.reduce((sum, playlist) => sum + (playlist.videos?.length ?? 0), 0)
  const recentWatched = ((history ?? []) as HistoryItem[])
    .filter((item) => item.video?.is_published && item.video.playlist?.slug && item.video.sub_category?.main_category?.slug === mainSlug)
    .slice(0, 6)
  const progressByVideoId = new Map<string, ProgressStatus>(
    ((progress ?? []) as Pick<VideoProgress, 'video_id' | 'status'>[]).map((item) => [item.video_id, item.status])
  )

  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm text-muted-foreground">
        <Link href="/dashboard" className="shrink-0 hover:text-foreground">홈</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="block min-w-0 flex-1 truncate font-medium text-foreground">{category.name}</span>
      </nav>

      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <FolderOpen className="h-3.5 w-3.5" />
          {subCategories.length}개 주제 · {allPlaylists.length}개 재생목록 · {allVideosCount}개 강의
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
          {category.description && (
            <p className="text-sm leading-6 text-muted-foreground">{category.description}</p>
          )}
        </div>
      </section>

      {recentWatched.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">최근 본 영상</h2>
            <Link href="/dashboard/history" className="text-xs text-primary hover:underline">전체 보기</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {recentWatched.map((item) => (
              <SmallVideoCard
                key={item.id}
                video={{
                  ...item.video,
                  subCategoryName: item.video.sub_category.name,
                  subCategorySlug: item.video.sub_category.slug,
                  mainCategorySlug: item.video.sub_category.main_category.slug,
                  playlistSlug: item.video.playlist?.slug ?? '',
                  playlistDifficulty: item.video.playlist?.difficulty ?? 'beginner',
                }}
                meta={new Date(item.watched_at).toLocaleDateString('ko-KR')}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">소카테고리별 재생목록</h2>
        {subCategories.map((sub) => {
          const playlists = ((sub.playlists ?? []) as Playlist[])
            .filter((playlist) => playlist.is_published)
            .map((playlist) => ({
              ...playlist,
              videos: (playlist.videos ?? []).filter((video) => video.is_published),
              subCategoryName: sub.name,
              subCategorySlug: sub.slug,
              mainCategorySlug: category.slug,
            }))
            .slice(0, 6)

          return (
            <div key={sub.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{sub.name}</h3>
                  {sub.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sub.description}</p>}
                </div>
                <Link href={`/learn/${category.slug}/${sub.slug}`} className="shrink-0 text-xs text-primary hover:underline">
                  전체 보기
                </Link>
              </div>
              {playlists.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  등록된 공개 재생목록이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
                  {playlists.map((playlist) => (
                    <SmallPlaylistCard key={playlist.id} playlist={playlist} progressByVideoId={progressByVideoId} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

function SmallVideoCard({ video, meta }: { video: CategoryVideo; meta?: string }) {
  return (
    <Link href={`/learn/${video.mainCategorySlug}/${video.subCategorySlug}/${video.playlistSlug}/${video.id}`} className="min-w-0">
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-sm">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PlayCircle className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 px-2.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {difficultyLabels[video.playlistDifficulty ?? 'beginner']}
            </Badge>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {video.subCategoryName}
            </Badge>
          </div>
          <p className="line-clamp-2 break-words text-xs font-medium leading-snug text-foreground">{video.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {video.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {video.duration}
              </span>
            )}
            {meta && <span>{meta}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function SmallPlaylistCard({
  playlist,
  progressByVideoId,
}: {
  playlist: CategoryPlaylist
  progressByVideoId: ReadonlyMap<string, ProgressStatus>
}) {
  const videos = playlist.videos ?? []
  const thumbnail = playlist.thumbnail_url || videos.find((video) => video.thumbnail_url)?.thumbnail_url
  const firstVideo = videos[0]
  const progressSummary = summarizePlaylistProgress(videos, progressByVideoId)
  const href = firstVideo
    ? `/learn/${playlist.mainCategorySlug}/${playlist.subCategorySlug}/${playlist.slug}/${firstVideo.id}`
    : `/learn/${playlist.mainCategorySlug}/${playlist.subCategorySlug}/${playlist.slug}`

  return (
    <Link href={href} className="min-w-0">
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-sm">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={playlist.name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ListVideo className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 px-2.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {progressSummary.totalCount}개 영상
            </Badge>
            {progressSummary.learningCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {progressSummary.learningCount}개 학습
              </Badge>
            )}
            {progressSummary.completedCount > 0 && (
              <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                {progressSummary.completedCount}개 완료
              </Badge>
            )}
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {difficultyLabels[playlist.difficulty ?? 'beginner']}
            </Badge>
          </div>
          <p className="line-clamp-2 break-words text-xs font-medium leading-snug text-foreground">{playlist.name}</p>
          {playlist.description && (
            <p className="line-clamp-2 break-words text-[11px] leading-4 text-muted-foreground">{playlist.description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
