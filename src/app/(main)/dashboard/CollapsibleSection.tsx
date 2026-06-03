'use client'

import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

export function CollapsibleSection({
  title,
  description,
  aside,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const sectionId = useId()

  return (
    <section>
      <input
        id={sectionId}
        type="checkbox"
        defaultChecked={defaultOpen}
        className="peer sr-only"
        aria-label={`${title} 접기 펼치기`}
      />
      <div className="mb-4 flex items-center justify-between gap-3 peer-checked:[&_[data-chevron]]:rotate-0">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aside}
          <label
            htmlFor={sectionId}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title={`${title} 접기/펼치기`}
          >
            <ChevronDown data-chevron className="h-4 w-4 -rotate-90 transition-transform" />
          </label>
        </div>
      </div>
      <div className="hidden peer-checked:block">{children}</div>
    </section>
  )
}
