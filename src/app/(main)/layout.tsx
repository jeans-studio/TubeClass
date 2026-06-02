import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Header } from '@/components/layout/Header'
import type { MainCategory } from '@/types'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: categories }] = await Promise.all([
    user
      ? supabase.from('profiles').select('*').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('main_categories')
      .select('*, sub_categories(id, name, slug, sort_order, main_category_id, description, created_at, updated_at)')
      .order('sort_order')
      .order('sort_order', { referencedTable: 'sub_categories' }),
  ])

  const cats = (categories as MainCategory[]) ?? []
  const isAdmin = profile?.role === 'admin'
  const isLoggedIn = !!user

  return (
    <div className="flex h-screen bg-background">
      {/* 데스크톱 사이드바 */}
      <div className="hidden md:flex">
        <Sidebar categories={cats} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header profile={profile}>
          <MobileSidebar categories={cats} isAdmin={isAdmin} isLoggedIn={isLoggedIn} />
        </Header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
