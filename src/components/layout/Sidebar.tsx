'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { MainCategory } from '@/types'
import { BookOpen, FileText, Info, LayoutDashboard, MessageSquareText, PanelLeftClose, PanelLeftOpen, Settings, Shield } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSidebarCollapsed } from './useSidebarCollapsed'

interface SidebarProps {
  categories: MainCategory[]
  isAdmin: boolean
  isLoggedIn: boolean
  onNavigate?: () => void
  collapsible?: boolean
}

export function Sidebar({ categories, isAdmin, isLoggedIn, onNavigate, collapsible = true }: SidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed(collapsible)

  const linkClassName = (active: boolean, size: 'default' | 'sm' = 'default') => cn(
    'flex items-center rounded-lg font-medium transition-colors',
    size === 'default' ? 'gap-2.5 px-3 py-2 text-sm' : 'gap-2.5 px-3 py-1.5 text-xs',
    isCollapsed && 'justify-center gap-0 px-0',
    active
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  )

  return (
    <aside
      className={cn(
        'flex h-dvh max-h-dvh min-h-0 flex-shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:sticky md:top-0',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      data-collapsed={isCollapsed}
    >
      {/* 로고 */}
      <div className={cn('group/sidebar-header relative flex h-14 items-center border-b border-sidebar-border px-3', isCollapsed ? 'justify-center' : 'justify-between')}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn('flex min-w-0 items-center', !isCollapsed && 'gap-2')}
          aria-label="TubeClass 홈"
        >
          <Image src="/brand/symbol.svg" alt="" width={32} height={32} priority className="h-8 w-8 shrink-0 invert dark:invert-0" />
          {!isCollapsed && (
            <Image src="/brand/logo.svg" alt="TubeClass" width={101} height={32} priority className="h-8 w-auto shrink-0 invert dark:invert-0" />
          )}
        </Link>
        {collapsible && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              isCollapsed && 'absolute opacity-0 group-hover/sidebar-header:opacity-100 focus-visible:opacity-100'
            )}
            aria-label={isCollapsed ? 'LNB 펼치기' : 'LNB 접기'}
            title={isCollapsed ? 'LNB 펼치기' : 'LNB 접기'}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <nav className={cn('space-y-1 p-3 pb-4', isCollapsed && 'px-2')}>
          {/* 대시보드 */}
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={linkClassName(pathname === '/dashboard')}
            title="홈"
          >
            <LayoutDashboard className="w-4 h-4" />
            {!isCollapsed && '홈'}
          </Link>

          {/* 나의 학습 — 로그인 시에만 */}
          {isLoggedIn && (
            <Link
              href="/dashboard/my-learning"
              onClick={onNavigate}
              className={linkClassName(pathname === '/dashboard/my-learning')}
              title="나의 학습"
            >
              <BookOpen className="w-4 h-4" />
              {!isCollapsed && '나의 학습'}
            </Link>
          )}

          {!isCollapsed && (
            <>
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
            </>
          )}
        </nav>
      </ScrollArea>

      {/* 하단 */}
      <div className={cn('shrink-0 p-3 border-t border-sidebar-border space-y-1', isCollapsed && 'px-2')}>
        <Link
          href="/about"
          onClick={onNavigate}
          className={linkClassName(pathname === '/about', 'sm')}
          title="소개"
        >
          <Info className="w-3.5 h-3.5" />
          {!isCollapsed && '소개'}
        </Link>
        {isLoggedIn && (
          <Link
            href="/feedback"
            onClick={onNavigate}
            className={linkClassName(pathname === '/feedback', 'sm')}
            title="피드백"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            {!isCollapsed && '피드백'}
          </Link>
        )}
        <Link
          href="/terms"
          onClick={onNavigate}
          className={linkClassName(pathname === '/terms', 'sm')}
          title="이용약관"
        >
          <FileText className="w-3.5 h-3.5" />
          {!isCollapsed && '이용약관'}
        </Link>
        <Link
          href="/privacy"
          onClick={onNavigate}
          className={linkClassName(pathname === '/privacy', 'sm')}
          title="개인정보 처리방침"
        >
          <Shield className="w-3.5 h-3.5" />
          {!isCollapsed && '개인정보 처리방침'}
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn('mt-2', linkClassName(pathname.startsWith('/admin')))}
            title="관리자"
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && '관리자'}
          </Link>
        )}
      </div>
    </aside>
  )
}
