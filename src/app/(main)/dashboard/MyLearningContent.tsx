import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AchievementBadge } from '@/components/badges/AchievementBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CollapsibleSection } from './CollapsibleSection'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  ListChecks,
  MessageSquareText,
  PlayCircle,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { Video, MainCategory } from '@/types'

const seoulDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

type BadgeTone = 'gold' | 'ruby' | 'emerald' | 'sapphire' | 'violet' | 'teal' | 'steel'
type BadgeShape = 'round' | 'hex' | 'shield'

interface LearningAchievement {
  key: string
  title: string
  description: string
  progressLabel: string
  achieved: boolean
  tone: BadgeTone
  shape: BadgeShape
  icon: typeof Trophy
  imageUrl?: string | null
}

const achievementGroups = [
  {
    title: '학습 시작',
    description: '처음 학습을 시작했는지 확인합니다',
    match: (key: string) => key === 'first-learning',
  },
  {
    title: '연속 학습',
    description: '매일 이어서 본 기록을 기준으로 집계됩니다',
    match: (key: string) => key.startsWith('streak-'),
  },
  {
    title: '영상 완료',
    description: '완료 처리한 영상 수를 기준으로 집계됩니다',
    match: (key: string) => key.startsWith('videos-'),
  },
  {
    title: '재생목록 완주',
    description: '재생목록 안의 공개 영상을 모두 완료하면 집계됩니다',
    match: (key: string) => key.startsWith('playlists-'),
  },
  {
    title: '카테고리 탐색',
    description: '서로 다른 대카테고리의 학습 기록을 기준으로 집계됩니다',
    match: (key: string) => key.startsWith('categories-'),
  },
  {
    title: '피드백 참여',
    description: '서비스 개선 의견을 남긴 기록을 기준으로 집계됩니다',
    match: (key: string) => key.startsWith('feedback-'),
  },
]

type ProgressVideo = Video & {
  playlist: { slug: string } | null
  sub_category: {
    name: string
    slug: string
    main_category: {
      name: string
      slug: string
    }
  } | null
}

type ProgressItem = {
  video_id: string
  status: 'learning' | 'completed'
  updated_at: string
  video?: ProgressVideo | null
}

function getSeoulDateKey(date: string | Date) {
  return seoulDateFormatter.format(new Date(date))
}

function getCurrentStreak(dateValues: string[]) {
  const learnedDays = new Set(dateValues.map(getSeoulDateKey))
  if (learnedDays.size === 0) return 0

  const cursor = new Date()
  const todayKey = getSeoulDateKey(cursor)

  if (!learnedDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
    const yesterdayKey = getSeoulDateKey(cursor)
    if (!learnedDays.has(yesterdayKey)) return 0
  }

  let streak = 0

  while (true) {
    const key = getSeoulDateKey(cursor)
    if (!learnedDays.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function buildMilestoneAchievements({
  watchedDays,
  currentStreak,
  completedVideos,
  completedPlaylists,
  exploredCategories,
  feedbackCount,
}: {
  watchedDays: number
  currentStreak: number
  completedVideos: number
  completedPlaylists: number
  exploredCategories: number
  feedbackCount: number
}): LearningAchievement[] {
  const streakMilestones = [3, 5, 10, 20, 30, 50, 100]
  const videoMilestones = [1, 5, 10, 30, 50, 100]
  const playlistMilestones = [1, 3, 5, 10]
  const categoryMilestones = [1, 3, 5]
  const feedbackMilestones = [1, 3, 5]

  return [
    {
      key: 'first-learning',
      title: '첫 학습 시작',
      description: '첫 영상을 시청하면 열리는 기본 뱃지',
      progressLabel: watchedDays > 0 ? '첫 학습 완료' : '영상 1개 시청 필요',
      achieved: watchedDays > 0,
      tone: 'gold',
      shape: 'round',
      icon: Sparkles,
    },
    ...streakMilestones.map((days, index) => ({
      key: `streak-${days}`,
      title: `${days}일 연속 학습`,
      description: '매일 한 번 이상 영상을 보면 연속 기록이 올라갑니다',
      progressLabel: `${Math.min(currentStreak, days)}/${days}일`,
      achieved: currentStreak >= days,
      tone: 'ruby' as BadgeTone,
      shape: (['shield', 'round', 'hex'] as BadgeShape[])[index % 3],
      icon: Flame,
    })),
    ...videoMilestones.map((count, index) => ({
      key: `videos-${count}`,
      title: `영상 ${count}개 완료`,
      description: '완료 처리한 영상 수가 기준에 도달하면 획득합니다',
      progressLabel: `${Math.min(completedVideos, count)}/${count}개`,
      achieved: completedVideos >= count,
      tone: 'emerald' as BadgeTone,
      shape: (['round', 'hex', 'shield'] as BadgeShape[])[index % 3],
      icon: CheckCircle2,
    })),
    ...playlistMilestones.map((count, index) => ({
      key: `playlists-${count}`,
      title: `재생목록 ${count}개 완주`,
      description: '재생목록 안의 공개 영상을 모두 완료하면 집계됩니다',
      progressLabel: `${Math.min(completedPlaylists, count)}/${count}개`,
      achieved: completedPlaylists >= count,
      tone: 'sapphire' as BadgeTone,
      shape: (['hex', 'shield', 'round'] as BadgeShape[])[index % 3],
      icon: ListChecks,
    })),
    ...categoryMilestones.map((count, index) => ({
      key: `categories-${count}`,
      title: `카테고리 ${count}개 탐색`,
      description: '서로 다른 대카테고리의 영상을 시청하면 획득합니다',
      progressLabel: `${Math.min(exploredCategories, count)}/${count}개`,
      achieved: exploredCategories >= count,
      tone: 'violet' as BadgeTone,
      shape: (['shield', 'hex', 'round'] as BadgeShape[])[index % 3],
      icon: Compass,
    })),
    ...feedbackMilestones.map((count, index) => ({
      key: `feedback-${count}`,
      title: `피드백 ${count}회 참여`,
      description: '서비스 개선 의견을 남기면 획득합니다',
      progressLabel: `${Math.min(feedbackCount, count)}/${count}회`,
      achieved: feedbackCount >= count,
      tone: 'teal' as BadgeTone,
      shape: (['round', 'shield', 'hex'] as BadgeShape[])[index % 3],
      icon: MessageSquareText,
    })),
  ]
}

export async function MyLearningContent() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: categories }, { data: history }, { data: progress }, { data: playlists }, { count: feedbackCount }] = await Promise.all([
    supabaseAdmin
      .from('main_categories')
      .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at, videos(*, sub_category_id))')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' }),
    user
      ? supabase
          .from('watch_history')
          .select('*, video:videos(*, playlist:playlists(slug), sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })
      : Promise.resolve({ data: null }),
    user
      ? supabaseAdmin
          .from('video_progress')
          .select('*, video:videos(*, playlist:playlists(slug), sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from('playlists')
      .select('id, videos(id, is_published)')
      .eq('is_published', true),
    user
      ? supabaseAdmin
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('author_user_id', user.id)
      : Promise.resolve({ count: 0 }),
  ])

  const publishedCategories = ((categories as MainCategory[] | null) ?? []).map((main) => ({
    ...main,
    sub_categories: main.sub_categories?.map((sub) => ({
      ...sub,
      videos: sub.videos?.filter((video) => video.is_published) ?? [],
    })),
  }))

  const totalVideos = publishedCategories.reduce((acc, mc) =>
    acc + (mc.sub_categories?.reduce((a: number, sc: { videos?: Video[] }) => a + (sc.videos?.length ?? 0), 0) ?? 0), 0) ?? 0
  const completedCount = progress?.filter((p) => p.status === 'completed').length ?? 0
  const learningCount = progress?.filter((p) => p.status === 'learning').length ?? 0
  const progressItems = (progress ?? []) as unknown as ProgressItem[]
  const learningVideos = progressItems
    .filter((item) => item.status === 'learning' && item.video?.is_published && item.video.playlist?.slug && item.video.sub_category?.main_category?.slug)
    .map((item) => item.video as ProgressVideo)
  const historyItems = history ?? []
  const watchedDays = new Set(historyItems.map((item) => getSeoulDateKey(item.watched_at))).size
  const currentStreak = getCurrentStreak(historyItems.map((item) => item.watched_at))
  const completedVideoIds = new Set(progress?.filter((p) => p.status === 'completed').map((p) => p.video_id) ?? [])
  const progressVideoIds = new Set(progress?.map((p) => p.video_id) ?? [])
  const watchedVideoIds = new Set(historyItems.map((item) => item.video_id).filter(Boolean))
  const activeVideoIds = new Set([...progressVideoIds, ...watchedVideoIds])
  const completedPlaylists = ((playlists as { id: string; videos?: { id: string; is_published: boolean }[] }[] | null) ?? []).filter((playlist) => {
    const publishedVideos = playlist.videos?.filter((video) => video.is_published) ?? []
    return publishedVideos.length > 0 && publishedVideos.every((video) => completedVideoIds.has(video.id))
  }).length
  const exploredCategorySlugs = new Set(
    historyItems
      .map((item) => {
        const video = item.video as { sub_category?: { main_category?: { slug?: string | null } | null } | null } | null
        return video?.sub_category?.main_category?.slug
      })
      .filter(Boolean)
  )
  const achievements = user
    ? buildMilestoneAchievements({
        watchedDays,
        currentStreak,
        completedVideos: completedCount,
        completedPlaylists,
        exploredCategories: exploredCategorySlugs.size,
        feedbackCount: feedbackCount ?? 0,
      })
    : []
  const achievedCount = achievements.filter((achievement) => achievement.achieved).length
  const groupedAchievements = achievementGroups
    .map((group) => {
      const items = achievements.filter((achievement) => group.match(achievement.key))
      const achievedItems = items.filter((achievement) => achievement.achieved).length

      return {
        ...group,
        items,
        achievedItems,
      }
    })
    .filter((group) => group.items.length > 0)
  const categoryProgressItems = publishedCategories
    .map((main) => {
      const subCategories = main.sub_categories?.map((sub) => {
        const subVideos = sub.videos ?? []
        const total = subVideos.length
        const done = user ? subVideos.filter((video) => completedVideoIds.has(video.id)).length : 0
        const hasActivity = user ? subVideos.some((video) => activeVideoIds.has(video.id)) : true

        return {
          ...sub,
          total,
          done,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
          hasActivity,
        }
      }) ?? []
      const visibleSubCategories = user ? subCategories.filter((sub) => sub.hasActivity) : subCategories
      const mainTotal = visibleSubCategories.reduce((acc, sub) => acc + sub.total, 0)
      const mainDone = visibleSubCategories.reduce((acc, sub) => acc + sub.done, 0)

      return {
        ...main,
        sub_categories: visibleSubCategories,
        mainTotal,
        mainDone,
        mainPct: mainTotal > 0 ? Math.round((mainDone / mainTotal) * 100) : 0,
      }
    })
    .filter((main) => !user || main.sub_categories.length > 0)

  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">나의 학습</h1>
        <p className="text-sm text-muted-foreground mt-1">학습 현황과 최근 본 강의를 확인합니다</p>
      </div>

      <div className={`grid gap-4 ${user ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-1 xl:max-w-xs'}`}>
        <Card className="pt-4">
          <CardContent className="flex items-center gap-4 px-4 py-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalVideos}</p>
              <p className="text-sm text-muted-foreground">전체 강의</p>
            </div>
          </CardContent>
        </Card>
        {user && (
          <>
            <Card className="pt-4">
              <CardContent className="flex items-center gap-4 px-4 py-0">
                <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{learningCount}</p>
                  <p className="text-sm text-muted-foreground">학습중</p>
                </div>
              </CardContent>
            </Card>
            <Card className="pt-4">
              <CardContent className="flex items-center gap-4 px-4 py-0">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">완료</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {user && learningVideos.length > 0 && (
        <CollapsibleSection
          title="학습중인 영상"
          description="이어볼 강의를 바로 확인합니다"
          aside={
            <Badge variant="secondary">
              {learningVideos.length}개
            </Badge>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {learningVideos.map((video) => {
              if (!video.playlist?.slug || !video.sub_category?.main_category?.slug) return null

              return (
                <Link
                  key={video.id}
                  href={`/learn/${video.sub_category.main_category.slug}/${video.sub_category.slug}/${video.playlist.slug}/${video.id}`}
                >
                  <Card className="group gap-0 overflow-hidden pb-0 transition-colors hover:border-primary/40">
                    <CardContent className="flex h-[5.75rem] gap-3 p-2.5">
                      <div className="relative aspect-video h-full shrink-0 overflow-hidden rounded-md bg-muted thumbnail-frame">
                        {video.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <PlayCircle className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            학습중
                          </Badge>
                          {video.duration && (
                            <span className="text-xs text-muted-foreground">{video.duration}</span>
                          )}
                        </div>
                        <p className="line-clamp-2 break-words text-sm font-medium leading-5 text-foreground">{video.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {video.sub_category.main_category.name} / {video.sub_category.name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {user && history && history.length > 0 && (
        <CollapsibleSection
          title="최근 본 영상"
          aside={
            <Link href="/dashboard/history" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {history.slice(0, 6).map((item) => {
              const video = item.video as Video & {
                playlist: { slug: string } | null
                sub_category: { name: string; slug: string; main_category: { name: string; slug: string } }
              }
              const prog = progress?.find((p) => p.video_id === video.id)
              if (!video.playlist?.slug) return null
              return (
                <Link
                  key={item.id}
                  href={`/learn/${video.sub_category.main_category.slug}/${video.sub_category.slug}/${video.playlist.slug}/${video.id}`}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="relative aspect-video w-full overflow-hidden bg-muted thumbnail-frame">
                      {video.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="pt-3 pb-3">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{video.sub_category.name}</span>
                        {prog && (
                          <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'} className="text-xs py-0">
                            {prog.status === 'completed' ? '완료' : '학습중'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="카테고리별 진도"
        description={user ? '시청 기록이 있는 카테고리만 보여줍니다' : '로그인하면 내 진도를 확인할 수 있습니다'}
      >
        {user && categoryProgressItems.length === 0 ? (
          <Card className="pt-4">
            <CardContent className="px-4 py-0">
              <p className="text-sm text-muted-foreground">아직 시청중인 카테고리가 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {categoryProgressItems.map((main) => (
              <Card key={main.id} className="pt-4">
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="truncate text-base">{main.name}</CardTitle>
                    {user && main.mainTotal > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">{main.mainDone}/{main.mainTotal} 완료</span>
                    )}
                  </div>
                  {user && main.mainTotal > 0 && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${main.mainPct}%` }}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 px-4 pt-1">
                  {main.sub_categories.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/learn/${main.slug}/${sub.slug}`}
                      className="group flex items-center gap-3 rounded-lg bg-secondary/70 px-3 py-2 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-foreground">{sub.name}</span>
                          {user && sub.total > 0 && (
                            <span className={`shrink-0 text-xs font-semibold ${sub.pct === 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {sub.pct}%
                            </span>
                          )}
                        </div>
                        {user && sub.total > 0 && (
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background/80">
                            <div className="h-full rounded-full bg-primary/80" style={{ width: `${sub.pct}%` }} />
                          </div>
                        )}
                      </div>
                      {user && sub.total > 0 && (
                        <span className="shrink-0 text-xs text-muted-foreground">{sub.done}/{sub.total}</span>
                      )}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {user && (
        <CollapsibleSection
          title="업적 뱃지"
          description={`${achievedCount}/${achievements.length}개 획득`}
          defaultOpen={false}
          aside={
            <Badge variant="secondary">
              현재 연속 {currentStreak}일
            </Badge>
          }
        >
          <div className="space-y-4">
            {groupedAchievements.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{group.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {group.achievedItems}/{group.items.length}개 획득
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                  {group.items.map(({ key, ...achievement }) => (
                    <AchievementBadge key={key} {...achievement} compact />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
