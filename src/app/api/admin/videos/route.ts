import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const videoSelect =
  '*, playlist:playlists(id, name, slug, sub_category_id, difficulty), sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))'

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabaseAdmin = createAdminClient()
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabaseAdmin }
}

async function listVideos(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  return supabaseAdmin
    .from('videos')
    .select(videoSelect)
    .order('sort_order')
}

function missingSchemaColumn(error: { message?: string; code?: string } | null) {
  if (!error || error.code !== 'PGRST204') return null

  const match = error.message?.match(/'([^']+)' column/)
  return match?.[1] ?? null
}

function isOptionalVideoColumn(column: string | null) {
  return (
    column === 'difficulty' ||
    column === 'youtube_published_at' ||
    column === 'youtube_channel_name' ||
    column === 'playlist_id'
  )
}

function shouldRetryWithoutOptionalColumn(error: { message?: string; code?: string } | null) {
  return isOptionalVideoColumn(missingSchemaColumn(error))
}

function removeOptionalVideoColumn<T extends Record<string, unknown>>(
  data: T,
  error: { message?: string; code?: string } | null
) {
  const column = missingSchemaColumn(error)
  const nextData = { ...data }

  if (isOptionalVideoColumn(column)) {
    delete nextData[column]
  }

  return nextData
}

async function insertVideoWithSchemaFallback(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  data: Record<string, unknown>
) {
  let nextData = data
  let result = await supabaseAdmin.from('videos').insert(nextData)

  while (shouldRetryWithoutOptionalColumn(result.error)) {
    nextData = removeOptionalVideoColumn(nextData, result.error)
    result = await supabaseAdmin.from('videos').insert(nextData)
  }

  return result
}

async function updateVideoWithSchemaFallback(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  id: string,
  data: Record<string, unknown>
) {
  let nextData = data
  let result = await supabaseAdmin.from('videos').update(nextData).eq('id', id)

  while (shouldRetryWithoutOptionalColumn(result.error)) {
    nextData = removeOptionalVideoColumn(nextData, result.error)
    result = await supabaseAdmin.from('videos').update(nextData).eq('id', id)
  }

  return result
}

export async function GET() {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const { data, error: queryError } = await listVideos(supabaseAdmin)
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  const nextData = { ...(body.data ?? {}) }

  if (nextData.playlist_id) {
    const { data: playlist, error: playlistError } = await supabaseAdmin
      .from('playlists')
      .select('sub_category_id')
      .eq('id', nextData.playlist_id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: '재생목록을 찾을 수 없습니다' }, { status: 400 })
    }

    nextData.sub_category_id = playlist.sub_category_id
  }

  const { error: queryError } = await insertVideoWithSchemaFallback(
    supabaseAdmin,
    nextData
  )

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listVideos(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ videos: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()

  if (Array.isArray(body.items)) {
    const results = await Promise.all(
      body.items.map((item: { id?: string; sort_order?: number }) => {
        if (!item.id || typeof item.sort_order !== 'number') {
          return Promise.resolve({ error: { message: 'Invalid video order item' } })
        }

        return supabaseAdmin
          .from('videos')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      })
    )
    const queryError = results.find((result) => result.error)?.error

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 400 })
    }

    const { data, error: listError } = await listVideos(supabaseAdmin)
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }

    return NextResponse.json({ videos: data ?? [] })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Invalid video update' }, { status: 400 })
  }

  const nextData = { ...(body.data ?? {}) }

  if (nextData.playlist_id) {
    const { data: playlist, error: playlistError } = await supabaseAdmin
      .from('playlists')
      .select('sub_category_id')
      .eq('id', nextData.playlist_id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: '재생목록을 찾을 수 없습니다' }, { status: 400 })
    }

    nextData.sub_category_id = playlist.sub_category_id
  }

  const { error: queryError } = await updateVideoWithSchemaFallback(
    supabaseAdmin,
    body.id,
    nextData
  )

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listVideos(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ videos: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  if (!body.id) {
    return NextResponse.json({ error: 'Invalid video delete' }, { status: 400 })
  }

  const { error: queryError } = await supabaseAdmin
    .from('videos')
    .delete()
    .eq('id', body.id)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listVideos(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ videos: data ?? [] })
}
