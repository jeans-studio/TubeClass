import Link from 'next/link'
import { ListVideo, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { summarizePlaylistProgress, type ProgressStatus } from '@/lib/learning-progress'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { MainCategory, Playlist, SubCategory, Video } from '@/types'

type PlaylistWithVideos = Playlist & {
  videos?: Video[]
  mainCategorySlug: string
  subCategorySlug: string
}

type SubCategoryWithPlaylists = SubCategory & {
  playlists?: PlaylistWithVideos[]
}

type MainCategoryWithRows = MainCategory & {
  sub_categories?: SubCategoryWithPlaylists[]
}

type ProgressVideo = Video & {
  playlist: (Playlist & {
    videos?: Pick<Video, 'id' | 'is_published'>[]
  }) | null
  sub_category: {
    name: string
    slug: string
    main_category: {
      name: string
      slug: string
    }
  } | null
}

type LearningProgress = {
  status: 'learning' | 'completed'
  updated_at: string
  video: ProgressVideo | null
}

type LearningPlaylist = {
  playlist: Playlist & {
    videos?: Pick<Video, 'id' | 'is_published'>[]
  }
  currentVideo: ProgressVideo
  mainCategoryName: string
  mainCategorySlug: string
  subCategoryName: string
  subCategorySlug: string
  completedCount: number
  totalCount: number
  updatedAt: string
}

const difficultyLabels: Record<Playlist['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function difficultyOf(playlist: Playlist): Playlist['difficulty'] {
  return playlist.difficulty ?? 'beginner'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: categories }, { data: progress }] = await Promise.all([
    supabaseAdmin
      .from('main_categories')
      .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at, playlists(*, videos(*, playlist_id)))')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' })
      .order('sort_order', { referencedTable: 'sub_categories.playlists' })
      .order('sort_order', { referencedTable: 'sub_categories.playlists.videos' }),
    user
      ? supabase
          .from('video_progress')
          .select('status, updated_at, video:videos(id, sub_category_id, playlist_id, title, description, youtube_url, youtube_id, thumbnail_url, duration, youtube_published_at, youtube_channel_name, difficulty, sort_order, is_published, created_at, updated_at, playlist:playlists(id, sub_category_id, name, slug, description, thumbnail_url, difficulty, sort_order, is_published, created_at, updated_at, videos(id, is_published)), sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: null }),
  ])

  const rows = ((categories ?? []) as MainCategoryWithRows[])
    .map((category) => ({
      ...category,
      sub_categories: (category.sub_categories ?? [])
        .map((subCategory) => ({
          ...subCategory,
          playlists: (subCategory.playlists ?? [])
            .filter((playlist) => playlist.is_published)
            .map((playlist) => ({
              ...playlist,
              videos: (playlist.videos ?? []).filter((video) => video.is_published),
              mainCategorySlug: category.slug,
              subCategorySlug: subCategory.slug,
            })),
        }))
        .filter((subCategory) => (subCategory.playlists ?? []).length > 0),
    }))
    .filter((category) => (category.sub_categories ?? []).length > 0)
  const progressItems = (progress ?? []) as unknown as LearningProgress[]
  const learningPlaylists = buildLearningPlaylists(progressItems)
  const progressByVideoId = new Map<string, ProgressStatus>(
    progressItems
      .filter((item) => item.video?.id)
      .map((item) => [item.video!.id, item.status])
  )

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <ListVideo className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h1 className="text-lg font-semibold text-foreground">공개된 재생목록이 없습니다</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            공개 상태의 카테고리와 재생목록이 등록되면 이곳에 표시됩니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-10 px-4 py-6 md:px-6 lg:px-8">
      {learningPlaylists.length > 0 && (
        <section className="space-y-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">학습중인 재생목록</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">이어볼 재생목록을 빠르게 다시 시작합니다</p>
            </div>
            <Link
              href="/dashboard/my-learning"
              className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              나의 학습
            </Link>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-3">
              {learningPlaylists.map((item) => (
                <LearningPlaylistCard key={item.playlist.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {rows.map((category) => (
        <section key={category.id} className="space-y-5">
          <div className="flex min-w-0 items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {category.name}
              </h2>
              {category.description && (
                <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
              )}
            </div>
            <Link
              href={`/learn/${category.slug}`}
              className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              전체 보기
            </Link>
          </div>

          <div className="space-y-8">
            {category.sub_categories?.map((subCategory) => (
              <section key={subCategory.id} className="space-y-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {subCategory.name}
                    </h3>
                    {subCategory.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
                        {subCategory.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/learn/${category.slug}/${subCategory.slug}`}
                    className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    더보기
                  </Link>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max gap-3 md:gap-4">
                    {subCategory.playlists?.map((playlist) => (
                      <PlaylistRailCard key={playlist.id} playlist={playlist} progressByVideoId={progressByVideoId} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function buildLearningPlaylists(progressItems: LearningProgress[]) {
  const completedVideoIdsByPlaylist = new Map<string, Set<string>>()

  for (const item of progressItems) {
    const video = item.video
    const playlist = video?.playlist
    if (!video?.is_published || !playlist?.is_published || !video.playlist_id) continue

    if (!completedVideoIdsByPlaylist.has(playlist.id)) {
      completedVideoIdsByPlaylist.set(playlist.id, new Set())
    }
    if (item.status === 'completed') {
      completedVideoIdsByPlaylist.get(playlist.id)?.add(video.id)
    }
  }

  const learningPlaylists = new Map<string, LearningPlaylist>()

  for (const item of progressItems) {
    const video = item.video
    const playlist = video?.playlist
    const subCategory = video?.sub_category
    const mainCategory = subCategory?.main_category
    if (
      item.status !== 'learning' ||
      !video?.is_published ||
      !playlist?.is_published ||
      !subCategory ||
      !mainCategory ||
      learningPlaylists.has(playlist.id)
    ) {
      continue
    }

    const publishedVideos = playlist.videos?.filter((playlistVideo) => playlistVideo.is_published) ?? []
    learningPlaylists.set(playlist.id, {
      playlist,
      currentVideo: video,
      mainCategoryName: mainCategory.name,
      mainCategorySlug: mainCategory.slug,
      subCategoryName: subCategory.name,
      subCategorySlug: subCategory.slug,
      completedCount: completedVideoIdsByPlaylist.get(playlist.id)?.size ?? 0,
      totalCount: publishedVideos.length,
      updatedAt: item.updated_at,
    })
  }

  return Array.from(learningPlaylists.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
}

function LearningPlaylistCard({ item }: { item: LearningPlaylist }) {
  const thumbnail = item.playlist.thumbnail_url || item.currentVideo.thumbnail_url
  const href = `/learn/${item.mainCategorySlug}/${item.subCategorySlug}/${item.playlist.slug}/${item.currentVideo.id}`
  const progressLabel = item.totalCount > 0
    ? `${item.completedCount}/${item.totalCount} 완료`
    : '학습중'

  return (
    <Link
      href={href}
      className="group block w-[84vw] max-w-[380px] shrink-0 sm:w-[360px] md:w-[380px]"
    >
      <div className="flex h-28 overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/40">
        <div className="relative aspect-video h-full shrink-0 overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={item.playlist.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PlayCircle className="h-7 w-7" />
            </div>
          )}
          <div className="absolute left-2 top-2">
            <Badge variant="secondary" className="bg-background/90 px-1.5 py-0 text-[10px]">
              {difficultyLabels[difficultyOf(item.playlist)]}
            </Badge>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
          <div className="mb-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <ListVideo className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.subCategoryName}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0">{progressLabel}</span>
          </div>
          <h3 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
            {item.playlist.name}
          </h3>
          <p className="mt-1 line-clamp-1 break-words text-xs text-muted-foreground">
            {item.currentVideo.title}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: item.totalCount > 0
                  ? `${Math.min(100, Math.round((item.completedCount / item.totalCount) * 100))}%`
                  : '10%',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function PlaylistRailCard({
  playlist,
  progressByVideoId,
}: {
  playlist: PlaylistWithVideos
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
    <Link
      href={href}
      className="group block w-[72vw] max-w-[320px] shrink-0 sm:w-[280px] md:w-[300px] lg:w-[320px]"
    >
      <div className="overflow-hidden rounded-md bg-card transition-transform duration-200 group-hover:-translate-y-0.5">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={playlist.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PlayCircle className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="px-0.5 pt-2">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
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
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {difficultyLabels[difficultyOf(playlist)]}
            </Badge>
          </div>
          <h3 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
            {playlist.name}
          </h3>
          {playlist.description && (
            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
              {playlist.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
