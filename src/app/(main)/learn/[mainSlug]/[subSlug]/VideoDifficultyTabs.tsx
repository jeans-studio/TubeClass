'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PlayCircle } from 'lucide-react'
import type { Video, VideoProgress } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type DifficultyFilter = 'all' | Video['difficulty']

interface VideoDifficultyTabsProps {
  videos: Video[]
  progress: VideoProgress[]
  mainSlug: string
  subSlug: string
  playlistSlug: string
}

const difficultyTabs: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
]

const difficultyLabels: Record<Video['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

function difficultyOf(video: Video): Video['difficulty'] {
  return video.difficulty ?? 'beginner'
}

export function VideoDifficultyTabs({
  videos,
  progress,
  mainSlug,
  subSlug,
  playlistSlug,
}: VideoDifficultyTabsProps) {
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyFilter>('all')

  const counts = useMemo(() => {
    return videos.reduce<Record<DifficultyFilter, number>>(
      (acc, video) => {
        acc.all += 1
        acc[difficultyOf(video)] += 1
        return acc
      },
      { all: 0, beginner: 0, intermediate: 0, advanced: 0 }
    )
  }, [videos])

  const filteredVideos = useMemo(() => {
    if (activeDifficulty === 'all') return videos
    return videos.filter((video) => difficultyOf(video) === activeDifficulty)
  }, [activeDifficulty, videos])

  return (
    <div className="space-y-4">
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

      {filteredVideos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>해당 난이도의 강의가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredVideos.map((video, idx) => {
            const prog = progress.find((item) => item.video_id === video.id)

            return (
              <Link key={video.id} href={`/learn/${mainSlug}/${subSlug}/${playlistSlug}/${video.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted thumbnail-frame">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <PlayCircle className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    {prog && (
                      <div className="absolute top-2 right-2">
                        <Badge variant={prog.status === 'completed' ? 'default' : 'secondary'} className="text-xs py-0">
                          {prog.status === 'completed' ? '완료' : '학습중'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-3 pb-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs py-0">
                        {difficultyLabels[difficultyOf(video)]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {video.duration && (
                        <span className="inline-flex items-center gap-1">
                          <PlayCircle className="h-3 w-3" />
                          {video.duration}
                        </span>
                      )}
                      {video.youtube_channel_name && <span>출처 {video.youtube_channel_name}</span>}
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
