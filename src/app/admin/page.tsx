import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FolderTree, Users, TrendingUp, CheckCircle2, Clock, ListVideo } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  const [
    { count: totalVideos },
    { count: totalPlaylists },
    { count: totalCategories },
    { count: totalUsers },
    { count: totalCompleted },
    { count: totalLearning },
    { data: recentVideos },
    { data: recentPlaylists },
    { data: topVideos },
  ] = await Promise.all([
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('playlists').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('sub_categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('video_progress').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('video_progress').select('*', { count: 'exact', head: true }).eq('status', 'learning'),
    supabase
      .from('videos')
      .select('id, title, created_at, sub_category:sub_categories(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('playlists')
      .select('id, name, difficulty, created_at, sub_category:sub_categories(name, main_category:main_categories(name))')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('watch_history')
      .select('video_id, videos(id, title, thumbnail_url)')
      .limit(100)
      .then(({ data }) => {
        // 영상별 시청 횟수 집계
        const counts: Record<string, { count: number; title: string; thumbnail: string | null }> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.forEach((h: any) => {
          if (!h.video_id || !h.videos) return
          counts[h.video_id] = counts[h.video_id]
            ? { ...counts[h.video_id], count: counts[h.video_id].count + 1 }
            : { count: 1, title: h.videos.title, thumbnail: h.videos.thumbnail_url }
        })
        return {
          data: Object.entries(counts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([id, val]) => ({ id, ...val })),
        }
      }),
  ])

  const stats = [
    { label: '전체 강의', value: totalVideos ?? 0, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: '재생목록', value: totalPlaylists ?? 0, icon: ListVideo, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950' },
    { label: '소카테고리', value: totalCategories ?? 0, icon: FolderTree, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950' },
    { label: '가입 사용자', value: totalUsers ?? 0, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950' },
    { label: '학습 완료', value: totalCompleted ?? 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
    { label: '학습중', value: totalLearning ?? 0, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950' },
    { label: '완료율', value: `${totalCompleted && totalLearning ? Math.round(((totalCompleted) / (totalCompleted + totalLearning)) * 100) : 0}%`, icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950' },
  ]

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">통계 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">TubeClass 서비스 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        {stats.map((s) => (
          <Card key={s.label} className="pt-4">
            <CardContent className="flex items-center gap-3 px-4 py-0">
              <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 최근 등록 영상 */}
        <Card className="pt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 등록 영상</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pt-0">
            {recentVideos?.map((v) => (
              <div key={v.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(v.sub_category as unknown as { name: string } | null)?.name} · {new Date(v.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))}
            {!recentVideos?.length && <p className="text-sm text-muted-foreground">등록된 영상이 없습니다</p>}
          </CardContent>
        </Card>

        {/* 최근 등록 재생목록 */}
        <Card className="pt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 등록 재생목록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pt-0">
            {recentPlaylists?.map((playlist) => {
              const subCategory = playlist.sub_category as unknown as { name: string; main_category: { name: string } | null } | null
              const difficulty = playlist.difficulty === 'advanced' ? '고급' : playlist.difficulty === 'intermediate' ? '중급' : '초급'

              return (
                <div key={playlist.id} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ListVideo className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {difficulty} · {subCategory?.main_category?.name} / {subCategory?.name} · {new Date(playlist.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              )
            })}
            {!recentPlaylists?.length && <p className="text-sm text-muted-foreground">등록된 재생목록이 없습니다</p>}
          </CardContent>
        </Card>

        {/* 인기 영상 (시청 횟수) */}
        <Card className="pt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">인기 영상 Top 5</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pt-0">
            {(topVideos as { id: string; title: string; thumbnail: string | null; count: number }[])?.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{v.count}회</span>
              </div>
            ))}
            {!topVideos?.length && <p className="text-sm text-muted-foreground">시청 기록이 없습니다</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
