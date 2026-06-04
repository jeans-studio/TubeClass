'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ListVideo, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  summarizePlaylistProgressFromRecord,
  type ProgressStatus,
} from '@/lib/learning-progress'
import { cn } from '@/lib/utils'
import type { Playlist, Video } from '@/types'

type DifficultyFilter = 'all' | Playlist['difficulty']
type PlaylistWithVideos = Playlist & {
  videos?: Video[]
}

interface PlaylistDifficultyTabsProps {
  playlists: PlaylistWithVideos[]
  mainSlug: string
  subSlug: string
  progressByVideoId: Record<string, ProgressStatus>
}

const difficultyTabs: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
]

const difficultyLabels: Record<Playlist['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function difficultyOf(playlist: Playlist): Playlist['difficulty'] {
  return playlist.difficulty ?? 'beginner'
}

export function PlaylistDifficultyTabs({
  playlists,
  mainSlug,
  subSlug,
  progressByVideoId,
}: PlaylistDifficultyTabsProps) {
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyFilter>('all')

  const counts = useMemo(() => {
    return playlists.reduce<Record<DifficultyFilter, number>>(
      (acc, playlist) => {
        acc.all += 1
        acc[difficultyOf(playlist)] += 1
        return acc
      },
      { all: 0, beginner: 0, intermediate: 0, advanced: 0 }
    )
  }, [playlists])

  const filteredPlaylists = useMemo(() => {
    if (activeDifficulty === 'all') return playlists
    return playlists.filter((playlist) => difficultyOf(playlist) === activeDifficulty)
  }, [activeDifficulty, playlists])

  return (
    <div className="space-y-4">
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
          {difficultyTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveDifficulty(tab.value)}
              className={cn(
                'inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-all hover:text-foreground',
                activeDifficulty === tab.value
                  ? 'bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30'
                  : 'text-foreground/60 dark:text-muted-foreground'
              )}
            >
              {tab.label}
              <span className="text-xs text-muted-foreground">{counts[tab.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {filteredPlaylists.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ListVideo className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>해당 난이도의 재생목록이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPlaylists.map((playlist) => {
            const videos = playlist.videos ?? []
            const thumbnail = playlist.thumbnail_url || videos.find((video) => video.thumbnail_url)?.thumbnail_url
            const firstVideo = videos[0]
            const progressSummary = summarizePlaylistProgressFromRecord(videos, progressByVideoId)
            const href = firstVideo
              ? `/learn/${mainSlug}/${subSlug}/${playlist.slug}/${firstVideo.id}`
              : `/learn/${mainSlug}/${subSlug}/${playlist.slug}`

            return (
              <Link key={playlist.id} href={href} className="min-w-0">
                <Card className="group h-full overflow-hidden transition-shadow hover:shadow-sm">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted thumbnail-frame">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt={playlist.name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <PlayCircle className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  </div>
                  <CardContent className="space-y-2 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <ListVideo className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            {progressSummary.totalCount}개 영상
                          </Badge>
                          {progressSummary.learningCount > 0 && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {progressSummary.learningCount}개 학습
                            </Badge>
                          )}
                          {progressSummary.completedCount > 0 && (
                            <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                              {progressSummary.completedCount}개 완료
                            </Badge>
                          )}
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {difficultyLabels[difficultyOf(playlist)]}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">{playlist.name}</p>
                        {playlist.description && (
                          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{playlist.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
