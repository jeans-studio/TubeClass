import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function isMissingFeedbackSchemaError(error: { code?: string } | null) {
  return error?.code === 'PGRST204' || error?.code === 'PGRST205'
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

  const { error: feedbackError } = await supabaseAdmin
    .from('feedbacks')
    .update({ author_user_id: null, author_email: null })
    .eq('author_user_id', user.id)

  if (feedbackError && !isMissingFeedbackSchemaError(feedbackError)) {
    return NextResponse.json({ error: feedbackError.message }, { status: 400 })
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
