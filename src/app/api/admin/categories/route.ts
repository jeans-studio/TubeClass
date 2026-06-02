import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const categorySelect =
  '*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)'

type CategoryEntity = 'main' | 'sub'

function tableFor(entity: CategoryEntity) {
  return entity === 'main' ? 'main_categories' : 'sub_categories'
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

async function listCategories(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  return supabaseAdmin
    .from('main_categories')
    .select(categorySelect)
    .order('sort_order')
    .order('sort_order', { referencedTable: 'sub_categories' })
}

export async function GET() {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const { data, error: queryError } = await listCategories(supabaseAdmin)
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  const entity = body.entity as CategoryEntity

  if (entity !== 'main' && entity !== 'sub') {
    return NextResponse.json({ error: 'Invalid category entity' }, { status: 400 })
  }

  const { error: queryError } = await supabaseAdmin
    .from(tableFor(entity))
    .insert(body.data)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listCategories(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  const entity = body.entity as CategoryEntity

  if (entity !== 'main' && entity !== 'sub') {
    return NextResponse.json({ error: 'Invalid category update' }, { status: 400 })
  }

  const queryError = Array.isArray(body.items)
    ? (await Promise.all(
        body.items.map((item: { id?: string; sort_order?: number }) => {
          if (!item.id || typeof item.sort_order !== 'number') {
            return Promise.resolve({ error: { message: 'Invalid category order item' } })
          }

          return supabaseAdmin
            .from(tableFor(entity))
            .update({ sort_order: item.sort_order })
            .eq('id', item.id)
        })
      )).find((result) => result.error)?.error
    : !body.id
      ? { message: 'Invalid category update' }
      : (await supabaseAdmin
          .from(tableFor(entity))
          .update(body.data)
          .eq('id', body.id)).error

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listCategories(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const { supabaseAdmin, error } = await getAdminClient()
  if (error) return error

  const body = await request.json()
  const entity = body.entity as CategoryEntity

  if ((entity !== 'main' && entity !== 'sub') || !body.id) {
    return NextResponse.json({ error: 'Invalid category delete' }, { status: 400 })
  }

  const { error: queryError } = await supabaseAdmin
    .from(tableFor(entity))
    .delete()
    .eq('id', body.id)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 })
  }

  const { data, error: listError } = await listCategories(supabaseAdmin)
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 })
  }

  return NextResponse.json({ categories: data ?? [] })
}
