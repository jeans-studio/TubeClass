'use client'

import { useTheme } from '@/components/ThemeProvider'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={resolvedTheme === 'dark' ? '라이트 테마로 변경' : '다크 테마로 변경'}
      title={resolvedTheme === 'dark' ? '라이트 테마' : '다크 테마'}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}
