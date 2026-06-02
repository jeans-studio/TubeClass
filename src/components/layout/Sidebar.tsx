'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { MainCategory } from '@/types'
import { BookOpen, FileText, History, Info, LayoutDashboard, MessageSquareText, Settings, Shield } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  categories: MainCategory[]
  isAdmin: boolean
  isLoggedIn: boolean
  onNavigate?: () => void
}

export function Sidebar({ categories, isAdmin, isLoggedIn, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-sidebar flex flex-col h-screen sticky top-0">
      {/* 로고 */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="font-bold text-sidebar-foreground text-lg">TubeClass</span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {/* 대시보드 */}
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === '/dashboard'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            홈
          </Link>

          {/* 나의 학습 — 로그인 시에만 */}
          {isLoggedIn && (
            <Link
              href="/dashboard/my-learning"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/my-learning'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <BookOpen className="w-4 h-4" />
              나의 학습
            </Link>
          )}

          {/* 최근 본 영상 — 로그인 시에만 */}
          {isLoggedIn && (
            <Link
              href="/dashboard/history"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/history'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <History className="w-4 h-4" />
              최근 본 영상
            </Link>
          )}

          <div className="pt-2 pb-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">카테고리</p>
          </div>

          {/* 대카테고리 > 소카테고리 */}
          {categories.map((main) => {
            const mainHref = `/learn/${main.slug}`
            const isMainActive = pathname === mainHref || pathname.startsWith(`${mainHref}/`)
            return (
              <div key={main.id} className="space-y-0.5">
                <Link
                  href={mainHref}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isMainActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {main.name}
                </Link>
                <div className="ml-3 border-l border-border pl-3">
                  {main.sub_categories?.map((sub) => {
                    const href = `/learn/${main.slug}/${sub.slug}`
                    return (
                      <Link
                        key={sub.id}
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                          'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                          pathname === href
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {sub.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* 하단 */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          href="/about"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            pathname === '/about'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Info className="w-3.5 h-3.5" />
          소개
        </Link>
        <Link
          href="/feedback"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            pathname === '/feedback'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          피드백
        </Link>
        <Link
          href="/terms"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            pathname === '/terms'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          이용약관
        </Link>
        <Link
          href="/privacy"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            pathname === '/privacy'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          개인정보 처리방침
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              'mt-2 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
            관리자
          </Link>
        )}
      </div>
    </aside>
  )
}
