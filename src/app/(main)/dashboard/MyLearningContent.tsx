import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { BookOpen, CheckCircle2, Clock, PlayCircle } from 'lucide-react'
import type { Video, MainCategory } from '@/types'

export async function MyLearningContent() {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: categories }, { data: history }, { data: progress }] = await Promise.all([
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
          .limit(6)
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('video_progress').select('*').eq('user_id', user.id)
      : Promise.resolve({ data: null }),
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

      {user && history && history.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">최근 본 영상</h2>
            <Link href="/dashboard/history" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </div>
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
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
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
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">카테고리별 진도</h2>
        <div className="space-y-4">
          {publishedCategories.map((main) => {
            const mainVideos = main.sub_categories?.flatMap((sc: { videos?: Video[] }) => sc.videos ?? []) ?? []
            const mainTotal = mainVideos.length
            const mainDone = user ? mainVideos.filter((v: Video) => progress?.some((p) => p.video_id === v.id && p.status === 'completed')).length : 0
            const mainPct = mainTotal > 0 ? Math.round((mainDone / mainTotal) * 100) : 0

            return (
              <Card key={main.id} className="pt-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{main.name}</CardTitle>
                    {user && mainTotal > 0 && (
                      <span className="text-xs text-muted-foreground">{mainDone}/{mainTotal} 완료</span>
                    )}
                  </div>
                  {user && mainTotal > 0 && (
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${mainPct}%` }}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-4 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {main.sub_categories?.map((sub: { id: string; name: string; slug: string; videos?: Video[] }) => {
                      const subTotal = sub.videos?.length ?? 0
                      const subDone = user ? (sub.videos ?? []).filter((v: Video) => progress?.some((p) => p.video_id === v.id && p.status === 'completed')).length : 0
                      const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0

                      return (
                        <Link key={sub.id} href={`/learn/${main.slug}/${sub.slug}`}>
                          <div className="group flex items-center gap-2 bg-secondary hover:bg-accent transition-colors rounded-lg px-3 py-1.5 cursor-pointer">
                            <span className="text-sm font-medium">{sub.name}</span>
                            {user && subTotal > 0 && (
                              <span className={`text-xs font-semibold ${subPct === 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {subPct}%
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
