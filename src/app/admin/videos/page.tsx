import { createAdminClient } from '@/lib/supabase/admin'
import { VideoManager } from './VideoManager'

export default async function VideosAdminPage() {
  const supabase = createAdminClient()

  const [{ data: categories }, { data: playlists }, { data: videos }] = await Promise.all([
    supabase
      .from('main_categories')
      .select('id, name, slug, sub_categories(id, name, slug)')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' }),
    supabase
      .from('playlists')
      .select('*, sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))')
      .order('sort_order'),
    supabase
      .from('videos')
      .select('*, playlist:playlists(id, name, slug, sub_category_id, difficulty), sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))')
      .order('sort_order'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <VideoManager initialVideos={(videos ?? []) as any} initialPlaylists={(playlists ?? []) as any} categories={(categories ?? []) as any} />
}
