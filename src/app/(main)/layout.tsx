import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Header } from '@/components/layout/Header'
import type { MainCategory } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('[layout] user:', user?.email ?? 'null')

  const { data: profile, error: profileError } = user
    ? await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()
    : { data: null, error: null }
  console.log('[layout] profile:', JSON.stringify(profile), 'error:', profileError?.message, profileError?.code)

  const { data: categories } = await supabaseAdmin
    .from('main_categories')
    .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at)')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'sub_categories' })

  const cats = (categories as MainCategory[]) ?? []
  const isAdmin = profile?.role === 'admin'
  const isLoggedIn = !!user

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar categories={cats} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header user={user} profile={profile}>
          <MobileSidebar categories={cats} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
        </Header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
