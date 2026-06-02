'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { MainCategory } from '@/types'

interface MobileSidebarProps {
  categories: MainCategory[]
  isAdmin: boolean
  isLoggedIn: boolean
}

export function MobileSidebar({ categories, isAdmin, isLoggedIn }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors outline-none">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <Sidebar
          categories={categories}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
