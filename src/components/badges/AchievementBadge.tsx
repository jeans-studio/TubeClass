import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Lock } from 'lucide-react'

import { cn } from '@/lib/utils'

type BadgeTone = 'gold' | 'ruby' | 'emerald' | 'sapphire' | 'violet' | 'teal' | 'steel'
type BadgeShape = 'round' | 'hex' | 'shield'

const toneStyles: Record<BadgeTone, { shell: string; face: string; ribbon: string; icon: string; card: string }> = {
  gold: {
    shell: 'from-amber-200 via-yellow-500 to-amber-800',
    face: 'from-slate-950 via-slate-900 to-amber-950',
    ribbon: 'bg-amber-500 text-amber-950',
    icon: 'text-amber-200',
    card: 'bg-amber-500/10 ring-amber-400/25',
  },
  ruby: {
    shell: 'from-rose-200 via-rose-600 to-red-950',
    face: 'from-slate-950 via-rose-950 to-slate-950',
    ribbon: 'bg-rose-500 text-white',
    icon: 'text-rose-100',
    card: 'bg-rose-500/10 ring-rose-400/25',
  },
  emerald: {
    shell: 'from-emerald-200 via-emerald-600 to-emerald-950',
    face: 'from-slate-950 via-emerald-950 to-slate-950',
    ribbon: 'bg-emerald-500 text-emerald-950',
    icon: 'text-emerald-100',
    card: 'bg-emerald-500/10 ring-emerald-400/25',
  },
  sapphire: {
    shell: 'from-sky-200 via-blue-600 to-blue-950',
    face: 'from-slate-950 via-blue-950 to-slate-950',
    ribbon: 'bg-sky-500 text-sky-950',
    icon: 'text-sky-100',
    card: 'bg-sky-500/10 ring-sky-400/25',
  },
  violet: {
    shell: 'from-violet-200 via-violet-600 to-violet-950',
    face: 'from-slate-950 via-violet-950 to-slate-950',
    ribbon: 'bg-violet-500 text-white',
    icon: 'text-violet-100',
    card: 'bg-violet-500/10 ring-violet-400/25',
  },
  teal: {
    shell: 'from-cyan-200 via-teal-500 to-teal-950',
    face: 'from-slate-950 via-teal-950 to-slate-950',
    ribbon: 'bg-teal-400 text-teal-950',
    icon: 'text-teal-100',
    card: 'bg-teal-500/10 ring-teal-400/25',
  },
  steel: {
    shell: 'from-zinc-200 via-zinc-500 to-zinc-900',
    face: 'from-zinc-950 via-zinc-900 to-slate-950',
    ribbon: 'bg-zinc-400 text-zinc-950',
    icon: 'text-zinc-100',
    card: 'bg-zinc-500/10 ring-zinc-400/25',
  },
}

const shapeStyles: Record<BadgeShape, string> = {
  round: 'rounded-full',
  hex: '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0_50%)]',
  shield: '[clip-path:polygon(50%_4%,92%_18%,84%_78%,50%_98%,16%_78%,8%_18%)]',
}

interface AchievementBadgeProps {
  title: string
  description: string
  progressLabel: string
  achieved: boolean
  icon: LucideIcon
  tone?: BadgeTone
  shape?: BadgeShape
  imageUrl?: string | null
  compact?: boolean
}

export function AchievementBadge({
  title,
  description,
  progressLabel,
  achieved,
  icon: Icon,
  tone = 'gold',
  shape = 'round',
  imageUrl,
  compact = false,
}: AchievementBadgeProps) {
  const colors = toneStyles[tone]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl ring-1 transition-colors',
        compact ? 'p-2.5' : 'p-3',
        achieved ? cn('shadow-sm', colors.card) : 'bg-card opacity-65 grayscale ring-foreground/10'
      )}
    >
      <div className={cn('flex items-start', compact ? 'gap-2.5' : 'gap-3')}>
        <div className={cn('relative shrink-0', compact ? 'h-10 w-10' : 'h-14 w-14')}>
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br shadow-[inset_0_2px_8px_rgba(255,255,255,0.35),0_8px_16px_rgba(0,0,0,0.24)]',
              compact ? 'p-0.5' : 'p-1',
              colors.shell,
              shapeStyles[shape]
            )}
          >
            <div
              className={cn(
                'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ring-1 ring-white/20',
                colors.face,
                shapeStyles[shape]
              )}
            >
              <div className="absolute inset-x-3 top-2 h-3 rounded-full bg-white/20 blur-sm" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,0.08),transparent_45%)]" />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className={cn('relative object-contain', compact ? 'h-5 w-5' : 'h-8 w-8')} />
              ) : (
                <Icon className={cn('relative drop-shadow-sm', compact ? 'h-4.5 w-4.5' : 'h-6 w-6', colors.icon)} strokeWidth={1.8} />
              )}
            </div>
          </div>
          <div className={cn('absolute rounded-sm px-1 py-0.5 text-center font-bold shadow-sm', compact ? '-bottom-1 left-1 right-1 text-[8px]' : '-bottom-1 left-1.5 right-1.5 text-[9px]', colors.ribbon)}>
            {achieved ? '획득' : 'LOCK'}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn('line-clamp-2 font-semibold leading-snug text-foreground', compact ? 'text-xs' : 'text-sm')}>{title}</h3>
            {achieved ? (
              <CheckCircle2 className={cn('mt-0.5 shrink-0 text-emerald-500', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            ) : (
              <Lock className={cn('mt-0.5 shrink-0 text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            )}
          </div>
          <p className={cn('mt-1 text-xs text-muted-foreground', compact ? 'line-clamp-1 leading-snug' : 'line-clamp-2 leading-relaxed')}>{description}</p>
          <p className={cn('font-medium text-foreground', compact ? 'mt-1 text-[11px]' : 'mt-2 text-xs')}>{progressLabel}</p>
        </div>
      </div>
    </div>
  )
}
