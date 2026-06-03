import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ListVideo } from 'lucide-react'
import { PlaylistDifficultyTabs } from './PlaylistDifficultyTabs'
import type { ProgressStatus } from '@/lib/learning-progress'
import type { Playlist, Video, VideoProgress } from '@/types'

interface PageProps {
  params: Promise<{ mainSlug: string; subSlug: string }>
}

type PlaylistWithVideos = Playlist & {
  videos?: Video[]
}

export default async function SubCategoryPage({ params }: PageProps) {
  const { mainSlug, subSlug } = await params
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: subCategory }, { data: progress }] = await Promise.all([
    supabaseAdmin
      .from('sub_categories')
      .select('*, main_category:main_categories!inner(id, name, slug), playlists(*, videos(*, playlist_id))')
      .eq('slug', subSlug)
      .eq('main_category.slug', mainSlug)
      .order('sort_order', { referencedTable: 'playlists' })
      .order('sort_order', { referencedTable: 'playlists.videos' })
      .single(),
    user
      ? supabase
          .from('video_progress')
          .select('video_id, status')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  if (!subCategory) notFound()

  const playlists: PlaylistWithVideos[] = ((subCategory.playlists ?? []) as PlaylistWithVideos[])
    .filter((playlist) => playlist.is_published)
    .map((playlist) => ({
      ...playlist,
      videos: (playlist.videos ?? []).filter((video) => video.is_published),
    }))

  const totalVideos = playlists.reduce((sum, playlist) => sum + (playlist.videos?.length ?? 0), 0)
  const progressByVideoId = Object.fromEntries(
    ((progress ?? []) as Pick<VideoProgress, 'video_id' | 'status'>[]).map((item) => [item.video_id, item.status])
  ) as Record<string, ProgressStatus>

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
        <PlaylistDifficultyTabs
          playlists={playlists}
          mainSlug={mainSlug}
          subSlug={subSlug}
          progressByVideoId={progressByVideoId}
        />
      )}
    </div>
  )
}
