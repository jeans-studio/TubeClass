import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, PlayCircle } from 'lucide-react'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string; videoId: string }>
}

export default async function VideoPage({ params }: PageProps) {
  const { mainSlug, subSlug, videoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: video }, { data: subCategory }, { data: progress }] = await Promise.all([
    supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single(),
    supabase
      .from('sub_categories')
      .select('*, main_category:main_categories(id, name, slug), videos(id, title, thumbnail_url, sort_order, youtube_id)')
      .eq('slug', subSlug)
      .order('sort_order', { referencedTable: 'videos' })
      .single(),
    user
      ? supabase
          .from('video_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  if (!video) notFound()

  const videos = subCategory?.videos ?? []
  const currentIndex = videos.findIndex((v: { id: string }) => v.id === videoId)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-foreground">홈</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/learn/${mainSlug}/${subSlug}`} className="hover:text-foreground">
          {subCategory?.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium line-clamp-1">{video.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 플레이어 + 정보 */}
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayer
            videoId={video.id}
            youtubeId={video.youtube_id}
            title={video.title}
            initialStatus={progress?.status ?? null}
            userId={user?.id ?? null}
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{video.title}</h1>
            {video.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{video.description}</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 강의 목록 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            강의 목록 ({videos.length}개)
          </h2>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {videos.map((v: { id: string; title: string; thumbnail_url: string | null; sort_order: number; youtube_id: string }, idx: number) => {
              const isCurrent = v.id === videoId
              return (
                <Link key={v.id} href={`/learn/${mainSlug}/${subSlug}/${v.id}`}>
                  <Card className={`overflow-hidden cursor-pointer transition-all ${isCurrent ? 'ring-2 ring-red-400 shadow-md' : 'hover:shadow-sm'}`}>
                    <CardContent className="p-2 flex gap-2.5">
                      <div className="relative w-20 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                        {v.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <PlayCircle className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1">
                          <span className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">{idx + 1}.</span>
                          <p className={`text-xs leading-snug line-clamp-2 ${isCurrent ? 'text-red-600 font-medium' : 'text-foreground'}`}>
                            {v.title}
                          </p>
                        </div>
                        {isCurrent && <Badge variant="destructive" className="mt-1 text-xs py-0 px-1.5">재생중</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
