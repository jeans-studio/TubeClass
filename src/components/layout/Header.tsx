'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronDown, Loader2, LogOut, Trash2, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/ThemeToggle'

interface HeaderProps {
  user: SupabaseUser | null
  profile: Profile | null
  children?: React.ReactNode
}

export function Header({ user, profile, children }: HeaderProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('로그아웃되었습니다')
    router.refresh()
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)

    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error ?? '회원 탈퇴 처리에 실패했습니다')
      }

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('회원 탈퇴가 완료되었습니다')
      setDeleteDialogOpen(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '회원 탈퇴 처리에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!user) {
    return (
      <header className="h-14 border-b bg-background flex items-center gap-2 px-4 sticky top-0 z-10">
        {children}
        <div className="flex-1" />
        <ThemeToggle />
        <Button onClick={handleGoogleLogin} variant="outline" size="sm" className="gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </Button>
      </header>
    )
  }

  const displayName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.email ??
    '사용자'
  const email = profile?.email ?? user.email ?? ''
  const avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 border-b bg-background flex items-center gap-2 px-4 sticky top-0 z-10">
      {children}
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex max-w-48 items-center gap-1.5 rounded-md px-1 py-0.5 outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar size="sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-secondary text-[10px] font-semibold text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-xs font-medium text-foreground sm:block">
            {displayName}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
            <User className="w-3.5 h-3.5 mr-2" />
            {email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5 mr-2" />
            로그아웃
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            회원 탈퇴
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 탈퇴</DialogTitle>
            <DialogDescription>
              계정과 학습 기록이 삭제됩니다. 피드백에 연결된 작성자 정보도 제거되며, 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
              취소
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting && <Loader2 className="animate-spin" />}
              탈퇴하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
