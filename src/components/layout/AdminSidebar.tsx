'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderTree, Video, ArrowLeft, LayoutDashboard, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/ThemeToggle'

const adminLinks = [
  { href: '/admin', label: '통계 대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: '가입 사용자', icon: Users },
  { href: '/admin/categories', label: '카테고리 관리', icon: FolderTree },
  { href: '/admin/videos', label: '영상 관리', icon: Video },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="min-w-0 truncate text-lg font-bold leading-none text-sidebar-foreground">
          TubeClassAdmin
        </span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          <div className="pt-1 pb-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              관리
            </p>
          </div>

          {adminLinks.map((item) => {
            const Icon = item.icon
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          학습 페이지로
        </Link>
      </div>
    </aside>
  )
}
