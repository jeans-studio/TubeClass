import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { BookOpen, CheckCircle2, Clock, PlayCircle } from 'lucide-react'
import type { Video, MainCategory } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: categories }, { data: history }, { data: progress }] = await Promise.all([
    supabase
      .from('main_categories')
      .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at, videos(id, title, thumbnail_url, youtube_id, youtube_url, duration, sort_order, is_published, description, created_at, updated_at, sub_category_id))')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' }),
    user
      ? supabase
          .from('watch_history')
          .select('*, video:videos(*, sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('video_progress').select('*').eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  const totalVideos = categories?.reduce((acc, mc) =>
    acc + (mc.sub_categories?.reduce((a: number, sc: { videos?: Video[] }) => a + (sc.videos?.length ?? 0), 0) ?? 0), 0) ?? 0
  const completedCount = progress?.filter((p) => p.status === 'completed').length ?? 0
  const learningCount = progress?.filter((p) => p.status === 'learning').length ?? 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* 통계 카드 */}
      <div className={`grid gap-4 ${user ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-1 max-w-xs'}`}>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
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
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{learningCount}</p>
                  <p className="text-sm text-muted-foreground">학습중</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
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

      {/* 최근 본 영상 — 로그인 사용자만 */}
      {user && history && history.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">최근 본 영상</h2>
            <Link href="/dashboard/history" className="text-sm text-red-500 hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.slice(0, 6).map((item) => {
              const video = item.video as Video & { sub_category: { name: string; slug: string; main_category: { name: string; slug: string } } }
              const prog = progress?.find((p) => p.video_id === video.id)
              return (
                <Link
                  key={item.id}
                  href={`/learn/${video.sub_category.main_category.slug}/${video.sub_category.slug}/${video.id}`}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="relative aspect-video bg-muted">
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

      {/* 카테고리 목록 */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">카테고리</h2>
        <div className="space-y-4">
          {(categories as MainCategory[])?.map((main) => (
            <Card key={main.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{main.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {main.sub_categories?.map((sub) => (
                    <Link key={sub.id} href={`/learn/${main.slug}/${sub.slug}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-accent transition-colors text-sm py-1 px-3">
                        {sub.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
