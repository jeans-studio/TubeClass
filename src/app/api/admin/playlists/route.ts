import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const playlistSelect =
  '*, sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))'

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

async function listPlaylists(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  return supabaseAdmin
    .from('playlists')
    .select(playlistSelect)
    .order('sort_order')
}

function playlistMigrationMessage(error: { code?: string; message?: string } | null) {
  if (error?.code === 'PGRST204') {
    return 'DB의 public.playlists 스키마가 최신이 아닙니다. Supabase SQL Editor에서 supabase/playlist_migration.sql을 다시 실행해 주세요.'
  }

  if (error?.code !== 'PGRST205') return error?.message ?? '재생목록 작업에 실패했습니다'

  return 'DB에 public.playlists 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/playlist_migration.sql을 먼저 실행해 주세요.'
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET() {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const { data, error: queryError } = await listPlaylists(supabaseAdmin)
  if (queryError) {
    return NextResponse.json({ error: playlistMigrationMessage(queryError) }, { status: 400 })
  }

  return NextResponse.json({ playlists: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  const data = body.data ?? {}
  const name = String(data.name ?? '').trim()
  const subCategoryId = String(data.sub_category_id ?? '')
  const slug = slugify(String(data.slug || name))

  if (!name || !subCategoryId || !slug) {
    return NextResponse.json({ error: '재생목록 이름과 소카테고리를 입력하세요' }, { status: 400 })
  }

  const { error: queryError } = await supabaseAdmin
    .from('playlists')
    .insert({
      sub_category_id: subCategoryId,
      name,
      slug,
      description: data.description || null,
      thumbnail_url: data.thumbnail_url || null,
      difficulty: data.difficulty || 'beginner',
      sort_order: data.sort_order ?? 0,
      is_published: data.is_published ?? true,
    })

  if (queryError) {
    return NextResponse.json({ error: playlistMigrationMessage(queryError) }, { status: 400 })
  }

  const { data: playlists, error: listError } = await listPlaylists(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: playlistMigrationMessage(listError) }, { status: 400 })
  }

  return NextResponse.json({ playlists: playlists ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()

  if (Array.isArray(body.items)) {
    const results = await Promise.all(
      body.items.map((item: { id?: string; sort_order?: number }) => {
        if (!item.id || typeof item.sort_order !== 'number') {
          return Promise.resolve({ error: { message: 'Invalid playlist order item' } })
        }

        return supabaseAdmin
          .from('playlists')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      })
    )
    const queryError = results.find((result) => result.error)?.error

    if (queryError) {
      return NextResponse.json({ error: playlistMigrationMessage(queryError) }, { status: 400 })
    }

    const { data: playlists, error: listError } = await listPlaylists(supabaseAdmin)
    if (listError) {
      return NextResponse.json({ error: playlistMigrationMessage(listError) }, { status: 400 })
    }

    return NextResponse.json({ playlists: playlists ?? [] })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Invalid playlist update' }, { status: 400 })
  }

  const data = body.data ?? {}
  const updateData: Record<string, unknown> = {}

  if ('name' in data) updateData.name = String(data.name).trim()
  if ('slug' in data) updateData.slug = slugify(String(data.slug))
  if ('description' in data) updateData.description = data.description || null
  if ('thumbnail_url' in data) updateData.thumbnail_url = data.thumbnail_url || null
  if ('difficulty' in data) updateData.difficulty = data.difficulty || 'beginner'
  if ('sub_category_id' in data) updateData.sub_category_id = data.sub_category_id
  if ('sort_order' in data) updateData.sort_order = data.sort_order
  if ('is_published' in data) updateData.is_published = data.is_published

  const { error: queryError } = await supabaseAdmin
    .from('playlists')
    .update(updateData)
    .eq('id', body.id)

  if (queryError) {
    return NextResponse.json({ error: playlistMigrationMessage(queryError) }, { status: 400 })
  }

  const { data: playlists, error: listError } = await listPlaylists(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: playlistMigrationMessage(listError) }, { status: 400 })
  }

  return NextResponse.json({ playlists: playlists ?? [] })
}

export async function DELETE(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  if (!body.id) {
    return NextResponse.json({ error: 'Invalid playlist delete' }, { status: 400 })
  }

  const { error: queryError } = await supabaseAdmin
    .from('playlists')
    .delete()
    .eq('id', body.id)

  if (queryError) {
    return NextResponse.json({ error: playlistMigrationMessage(queryError) }, { status: 400 })
  }

  const { data: playlists, error: listError } = await listPlaylists(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: playlistMigrationMessage(listError) }, { status: 400 })
  }

  return NextResponse.json({ playlists: playlists ?? [] })
}
