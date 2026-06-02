import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight, ListVideo, PlayCircle } from 'lucide-react'
import type { Playlist, Video } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string }>
}

type PlaylistWithVideos = Playlist & {
  videos?: Video[]
}

const difficultyLabels: Record<Playlist['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export default async function SubCategoryPage({ params }: PageProps) {
  const { mainSlug, subSlug } = await params
  const supabaseAdmin = createAdminClient()

  const { data: subCategory } = await supabaseAdmin
    .from('sub_categories')
    .select('*, main_category:main_categories!inner(id, name, slug), playlists(*, videos(*, playlist_id))')
    .eq('slug', subSlug)
    .eq('main_category.slug', mainSlug)
    .order('sort_order', { referencedTable: 'playlists' })
    .order('sort_order', { referencedTable: 'playlists.videos' })
    .single()

  if (!subCategory) notFound()

  const playlists: PlaylistWithVideos[] = ((subCategory.playlists ?? []) as PlaylistWithVideos[])
    .filter((playlist) => playlist.is_published)
    .map((playlist) => ({
      ...playlist,
      videos: (playlist.videos ?? []).filter((video) => video.is_published),
    }))

  const totalVideos = playlists.reduce((sum, playlist) => sum + (playlist.videos?.length ?? 0), 0)

  return (
    <div className="w-full p-4 md:p-6">
      <nav className="mb-4 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm text-muted-foreground">
        <Link href="/dashboard" className="shrink-0 hover:text-foreground">홈</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/learn/${mainSlug}`} className="block max-w-[28vw] shrink-0 truncate hover:text-foreground sm:max-w-32 md:max-w-48">
          {subCategory.main_category?.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="block min-w-0 flex-1 truncate font-medium text-foreground">{subCategory.name}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground">{subCategory.name}</h1>
          {subCategory.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{subCategory.description}</p>}
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{playlists.length}개 재생목록 · {totalVideos}개 강의</span>
      </div>

      {playlists.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ListVideo className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>아직 등록된 재생목록이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {playlists.map((playlist) => {
            const videos = playlist.videos ?? []
            const thumbnail = playlist.thumbnail_url || videos.find((video) => video.thumbnail_url)?.thumbnail_url
            const firstVideo = videos[0]
            const href = firstVideo
              ? `/learn/${mainSlug}/${subSlug}/${playlist.slug}/${firstVideo.id}`
              : `/learn/${mainSlug}/${subSlug}/${playlist.slug}`

            return (
              <Link key={playlist.id} href={href} className="min-w-0">
                <Card className="group h-full overflow-hidden transition-shadow hover:shadow-sm">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt={playlist.name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <PlayCircle className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    <Badge variant="secondary" className="absolute left-2 top-2 text-xs">
                      {videos.length}개 강의
                    </Badge>
                    <Badge variant="outline" className="absolute right-2 top-2 bg-background/90 text-xs">
                      {difficultyLabels[playlist.difficulty ?? 'beginner']}
                    </Badge>
                  </div>
                  <CardContent className="space-y-2 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <ListVideo className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">{playlist.name}</p>
                        {playlist.description && (
                          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{playlist.description}</p>
                        )}
                      </div>
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
