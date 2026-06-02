import { createClient } from '@/lib/supabase/server'
import { VideoManager } from './VideoManager'

export default async function VideosAdminPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: videos }] = await Promise.all([
    supabase
      .from('main_categories')
      .select('id, name, slug, sub_categories(id, name, slug)')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' }),
    supabase
      .from('videos')
      .select('*, sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))')
      .order('sort_order'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <VideoManager initialVideos={(videos ?? []) as any} categories={(categories ?? []) as any} />
}
