import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, FolderTree, Video, ArrowLeft } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* 관리자 사이드바 */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-700">
          <div className="w-7 h-7 rounded-md bg-red-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">TubeClass 관리</span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <Link href="/admin/categories" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <FolderTree className="w-4 h-4" />
            카테고리 관리
          </Link>
          <Link href="/admin/videos" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Video className="w-4 h-4" />
            영상 관리
          </Link>
        </nav>
        <div className="p-3 border-t border-slate-700">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            학습 페이지로
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
