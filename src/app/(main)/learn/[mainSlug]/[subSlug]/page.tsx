import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, ChevronRight } from 'lucide-react'
import type { Video } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string }>
}

export default async function SubCategoryPage({ params }: PageProps) {
  const { mainSlug, subSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subCategory } = await supabase
    .from('sub_categories')
    .select('*, main_category:main_categories(id, name, slug), videos(*, sub_category_id)')
    .eq('slug', subSlug)
    .eq('main_category.slug', mainSlug)
    .order('sort_order', { referencedTable: 'videos' })
    .single()

  if (!subCategory) notFound()

  const { data: progress } = await supabase
    .from('video_progress')
    .select('*')
    .eq('user_id', user!.id)

  const videos: Video[] = subCategory.videos ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard" className="hover:text-slate-700">홈</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>{subCategory.main_category?.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{subCategory.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">{subCategory.name}</h1>
        <span className="text-sm text-muted-foreground">{videos.length}개 강의</span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>아직 등록된 강의가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video, idx) => {
            const prog = progress?.find((p) => p.video_id === video.id)
            return (
              <Link key={video.id} href={`/learn/${mainSlug}/${subSlug}/${video.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="relative aspect-video bg-muted">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <PlayCircle className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    {prog && (
                      <div className="absolute top-2 right-2">
                        <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'} className="text-xs py-0">
                          {prog.status === 'completed' ? '완료' : '학습중'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                    {video.duration && (
                      <p className="text-xs text-muted-foreground mt-1">{video.duration}</p>
                    )}
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
