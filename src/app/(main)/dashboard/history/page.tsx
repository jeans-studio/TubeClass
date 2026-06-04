import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { PlayCircle, History } from 'lucide-react'
import type { Video } from '@/types'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: history }, { data: progress }] = await Promise.all([
    user
      ? supabase
          .from('watch_history')
          .select('*, video:videos(*, playlist:playlists(slug), sub_category:sub_categories(name, slug, main_category:main_categories(name, slug)))')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('video_progress').select('*').eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">최근 본 영상</h1>
        <span className="text-sm text-muted-foreground">({history?.length ?? 0}개)</span>
      </div>

      {!history || history.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>아직 본 영상이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {history.map((item) => {
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
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">{video.sub_category.name}</span>
                      <div className="flex items-center gap-1.5">
                        {prog && (
                          <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'} className="text-xs py-0">
                            {prog.status === 'completed' ? '완료' : '학습중'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.watched_at).toLocaleDateString('ko-KR')}
                    </p>
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
