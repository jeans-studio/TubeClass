import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractYouTubePlaylistId, formatYouTubeDuration, getYouTubeThumbnail } from '@/lib/youtube'

const videoSelect =
  '*, playlist:playlists(id, name, slug, sub_category_id, difficulty), sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))'

const playlistSelect =
  '*, sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))'

type PlaylistItem = {
  snippet?: {
    title?: string
    description?: string
    position?: number
    resourceId?: {
      videoId?: string
    }
  }
}

type PlaylistItemsResponse = {
  nextPageToken?: string
  items?: PlaylistItem[]
  error?: {
    message?: string
  }
}

type VideoDetails = {
  id: string
  snippet?: {
    title?: string
    description?: string
    publishedAt?: string
    channelTitle?: string
    thumbnails?: Record<string, { url?: string }>
  }
  contentDetails?: {
    duration?: string
  }
}

type VideosResponse = {
  items?: VideoDetails[]
  error?: {
    message?: string
  }
}

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

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function bestThumbnail(video: VideoDetails) {
  const thumbnails = video.snippet?.thumbnails
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    getYouTubeThumbnail(video.id)
  )
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0
}

async function fetchPlaylistVideoIds(playlistId: string, apiKey: string, maxItems: number) {
  const ids: string[] = []
  let pageToken = ''

  while (ids.length < maxItems) {
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      playlistId,
      maxResults: String(Math.min(50, maxItems - ids.length)),
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`)
    const data = (await response.json().catch(() => null)) as PlaylistItemsResponse | null

    if (!response.ok || data?.error) {
      throw new Error(data?.error?.message ?? 'YouTube 재생목록을 가져오지 못했습니다')
    }

    for (const item of data?.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId
      if (videoId) ids.push(videoId)
    }

    if (!data?.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return ids
}

async function fetchVideoDetails(ids: string[], apiKey: string) {
  const videos = new Map<string, VideoDetails>()

  for (const part of chunk(ids, 50)) {
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet,contentDetails',
      id: part.join(','),
      maxResults: '50',
    })

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`)
    const data = (await response.json().catch(() => null)) as VideosResponse | null

    if (!response.ok || data?.error) {
      throw new Error(data?.error?.message ?? 'YouTube 영상 정보를 가져오지 못했습니다')
    }

    for (const video of data?.items ?? []) {
      videos.set(video.id, video)
    }
  }

  return videos
}

export async function POST(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: '.env.local에 YOUTUBE_API_KEY를 추가한 뒤 dev 서버를 재시작해 주세요' },
      { status: 400 }
    )
  }

  const body = await request.json().catch(() => null)
  const playlistId = String(body?.playlist_id ?? '')
  const youtubePlaylistUrl = String(body?.youtube_playlist_url ?? '')
  const youtubePlaylistId = extractYouTubePlaylistId(youtubePlaylistUrl)
  const maxItems = Math.min(Math.max(Number(body?.max_items ?? 200), 1), 500)

  if (!playlistId) {
    return NextResponse.json({ error: '가져올 내부 재생목록을 선택하세요' }, { status: 400 })
  }

  if (!youtubePlaylistId) {
    return NextResponse.json({ error: '유효한 YouTube 재생목록 URL이 아닙니다' }, { status: 400 })
  }

  const { data: playlist, error: playlistError } = await supabaseAdmin
    .from('playlists')
    .select('id, sub_category_id, difficulty, thumbnail_url')
    .eq('id', playlistId)
    .single()

  if (playlistError || !playlist) {
    return NextResponse.json({ error: '내부 재생목록을 찾을 수 없습니다' }, { status: 400 })
  }

  const ids = await fetchPlaylistVideoIds(youtubePlaylistId, apiKey, maxItems)
  if (ids.length === 0) {
    return NextResponse.json({ error: '가져올 수 있는 공개 영상이 없습니다' }, { status: 400 })
  }

  const [{ data: existing }, { data: latest }] = await Promise.all([
    supabaseAdmin
      .from('videos')
      .select('youtube_id, duration, thumbnail_url, youtube_published_at, youtube_channel_name, description')
      .eq('playlist_id', playlistId)
      .in('youtube_id', ids),
    supabaseAdmin
      .from('videos')
      .select('sort_order')
      .eq('playlist_id', playlistId)
      .order('sort_order', { ascending: false })
      .limit(1),
  ])

  const existingRows = existing ?? []
  const existingIds = new Set(existingRows.map((item) => item.youtube_id))
  const newIds = ids.filter((id) => !existingIds.has(id))
  const refreshIds = existingRows
    .filter((item) =>
      isBlank(item.duration) ||
      isBlank(item.thumbnail_url) ||
      isBlank(item.youtube_channel_name) ||
      isBlank(item.description) ||
      !item.youtube_published_at
    )
    .map((item) => item.youtube_id)
  const details = newIds.length > 0 || refreshIds.length > 0
    ? await fetchVideoDetails(Array.from(new Set([...newIds, ...refreshIds])), apiKey)
    : new Map<string, VideoDetails>()

  if (newIds.length > 0) {
    const startOrder = latest?.[0]?.sort_order ?? 0
    const inserts = newIds
      .map((id, index) => {
        const detail = details.get(id)
        const title = detail?.snippet?.title?.trim()
        if (!detail || !title) return null

        return {
          playlist_id: playlistId,
          sub_category_id: playlist.sub_category_id,
          difficulty: playlist.difficulty ?? 'beginner',
          title,
          description: detail.snippet?.description ?? '',
          youtube_url: `https://www.youtube.com/watch?v=${id}`,
          youtube_id: id,
          thumbnail_url: bestThumbnail(detail),
          duration: formatYouTubeDuration(detail.contentDetails?.duration),
          youtube_published_at: detail.snippet?.publishedAt?.slice(0, 10) ?? null,
          youtube_channel_name: detail.snippet?.channelTitle ?? '',
          sort_order: startOrder + index + 1,
          is_published: true,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('videos').insert(inserts)
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      if (!playlist.thumbnail_url && inserts[0]?.thumbnail_url) {
        await supabaseAdmin
          .from('playlists')
          .update({ thumbnail_url: inserts[0].thumbnail_url })
          .eq('id', playlistId)
      }
    }
  }

  if (refreshIds.length > 0) {
    await Promise.all(
      existingRows.map(async (item) => {
        const detail = details.get(item.youtube_id)
        if (!detail) return

        const nextDuration = formatYouTubeDuration(detail.contentDetails?.duration)
        const nextThumbnail = bestThumbnail(detail)
        const nextPublishedAt = detail.snippet?.publishedAt?.slice(0, 10) ?? null
        const nextChannelName = detail.snippet?.channelTitle ?? ''
        const nextDescription = detail.snippet?.description ?? ''
        const update: Record<string, string | null> = {}

        if (isBlank(item.duration) && nextDuration) update.duration = nextDuration
        if (isBlank(item.thumbnail_url) && nextThumbnail) update.thumbnail_url = nextThumbnail
        if (!item.youtube_published_at && nextPublishedAt) update.youtube_published_at = nextPublishedAt
        if (isBlank(item.youtube_channel_name) && nextChannelName) update.youtube_channel_name = nextChannelName
        if (isBlank(item.description) && nextDescription) update.description = nextDescription

        if (Object.keys(update).length === 0) return

        const { error: updateError } = await supabaseAdmin
          .from('videos')
          .update(update)
          .eq('playlist_id', playlistId)
          .eq('youtube_id', item.youtube_id)

        if (updateError) throw updateError
      })
    )
  }

  const [{ data: videos, error: videosError }, { data: playlists, error: playlistsError }] = await Promise.all([
    supabaseAdmin.from('videos').select(videoSelect).order('sort_order'),
    supabaseAdmin.from('playlists').select(playlistSelect).order('sort_order'),
  ])

  if (videosError) {
    return NextResponse.json({ error: videosError.message }, { status: 400 })
  }

  if (playlistsError) {
    return NextResponse.json({ error: playlistsError.message }, { status: 400 })
  }

  return NextResponse.json({
    imported: newIds.length,
    skipped: ids.length - newIds.length,
    videos: videos ?? [],
    playlists: playlists ?? [],
  })
}
