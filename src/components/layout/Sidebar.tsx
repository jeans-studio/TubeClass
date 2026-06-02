'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { MainCategory } from '@/types'
import { BookOpen, ChevronDown, ChevronRight, LayoutDashboard, History, Settings } from 'lucide-react'
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  categories: MainCategory[]
  isAdmin: boolean
  isLoggedIn: boolean
  onNavigate?: () => void
}

export function Sidebar({ categories, isAdmin, isLoggedIn, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string[]>([])

  function toggleExpand(id: string) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-sidebar flex flex-col h-screen sticky top-0">
      {/* 로고 */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary-foreground" />
        </div>
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
            const isExpanded = expanded.includes(main.id)
            return (
              <div key={main.id}>
                <button
                  onClick={() => toggleExpand(main.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-accent transition-colors"
                >
                  <span className="flex-1 text-left">{main.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-3 pl-3 border-l border-border space-y-0.5 mt-0.5">
                    {main.sub_categories?.map((sub) => {
                      const href = `/learn/${main.slug}/${sub.slug}`
                      return (
                        <Link
                          key={sub.id}
                          href={href}
                          onClick={onNavigate}
                          className={cn(
                            'block px-3 py-1.5 rounded-lg text-sm transition-colors',
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
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* 하단 */}
      {isAdmin && (
        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
            관리자
          </Link>
        </div>
      )}
    </aside>
  )
}
