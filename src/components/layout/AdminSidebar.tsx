'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderTree, MessageSquareText, Video, ArrowLeft, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSidebarCollapsed } from './useSidebarCollapsed'

const adminLinks = [
  { href: '/admin', label: '통계 대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: '가입 사용자', icon: Users },
  { href: '/admin/feedback', label: '피드백 관리', icon: MessageSquareText },
  { href: '/admin/categories', label: '카테고리 관리', icon: FolderTree },
  { href: '/admin/videos', label: '영상 관리', icon: Video },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed()

  return (
    <aside
      className={cn(
        'flex h-dvh max-h-dvh min-h-0 flex-shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:sticky md:top-0',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      data-collapsed={isCollapsed}
    >
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-3', isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed && (
          <span className="min-w-0 truncate text-lg font-bold leading-none text-sidebar-foreground">
            TubeClassAdmin
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={isCollapsed ? 'LNB 펼치기' : 'LNB 접기'}
          title={isCollapsed ? 'LNB 펼치기' : 'LNB 접기'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <nav className={cn('p-3 space-y-1', isCollapsed && 'px-2')}>
          {!isCollapsed && (
            <div className="pt-1 pb-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                관리
              </p>
            </div>
          )}

          {adminLinks.map((item) => {
            const Icon = item.icon
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isCollapsed && 'justify-center gap-0 px-0',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {!isCollapsed && item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className={cn('shrink-0 p-3 border-t border-sidebar-border space-y-2', isCollapsed && 'px-2')}>
        <div className={cn('flex items-center justify-between px-3 py-1.5', isCollapsed && 'justify-center px-0')}>
          {!isCollapsed && <span className="text-xs font-medium text-muted-foreground">테마</span>}
          <ThemeToggle />
        </div>
        <Link
          href="/dashboard"
          title="학습 페이지로"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            isCollapsed && 'justify-center gap-0 px-0'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          {!isCollapsed && '학습 페이지로'}
        </Link>
      </div>
    </aside>
  )
}
