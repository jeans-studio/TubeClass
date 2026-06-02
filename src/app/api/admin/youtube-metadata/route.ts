import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube'

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function matchMeta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }
  return null
}

function matchPublishedDate(html: string) {
  const patterns = [
    /"publishDate"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /"uploadDate"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /itemprop=["']datePublished["'][^>]+content=["'](\d{4}-\d{2}-\d{2})/i,
    /itemprop=["']uploadDate["'][^>]+content=["'](\d{4}-\d{2}-\d{2})/i,
    /<meta[^>]+property=["']video:release_date["'][^>]+content=["'](\d{4}-\d{2}-\d{2})/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl.searchParams.get('url') ?? ''
  const youtubeId = extractYouTubeId(url)

  if (!youtubeId) {
    return NextResponse.json({ error: '유효한 YouTube URL이 아닙니다' }, { status: 400 })
  }

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`
  let title = ''
  let description = ''
  let duration = ''
  let youtubePublishedAt: string | null = null
  let youtubeChannelName = ''

  const oembedResponse = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    { next: { revalidate: 3600 } }
  ).catch(() => null)

  if (oembedResponse?.ok) {
    const data = await oembedResponse.json().catch(() => null)
    title = data?.title ?? ''
    youtubeChannelName = data?.author_name ?? ''
  }

  const pageResponse = await fetch(watchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      Accept: 'text/html',
    },
    next: { revalidate: 3600 },
  }).catch(() => null)

  if (pageResponse?.ok) {
    const html = await pageResponse.text()
    title = title || matchMeta(html, 'og:title') || matchMeta(html, 'title') || ''
    description = matchMeta(html, 'og:description') || matchMeta(html, 'description') || ''
    youtubeChannelName =
      youtubeChannelName ||
      matchMeta(html, 'author') ||
      matchMeta(html, 'twitter:creator') ||
      ''

    const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/)
    if (lengthMatch?.[1]) {
      duration = formatDuration(Number(lengthMatch[1]))
    }
    youtubePublishedAt = matchPublishedDate(html)
  }

  if (!title) {
    return NextResponse.json({ error: 'YouTube 메타데이터를 가져오지 못했습니다' }, { status: 400 })
  }

  return NextResponse.json({
    youtube_id: youtubeId,
    youtube_url: watchUrl,
    title,
    description,
    duration,
    youtube_published_at: youtubePublishedAt,
    youtube_channel_name: youtubeChannelName,
    thumbnail_url: getYouTubeThumbnail(youtubeId),
  })
}
