import type { Video, VideoProgress } from '@/types'

export type ProgressStatus = VideoProgress['status']

export type PlaylistProgressSummary = {
  totalCount: number
  learningCount: number
  completedCount: number
}

type VideoLike = Pick<Video, 'id' | 'is_published'>

export function summarizePlaylistProgress(
  videos: VideoLike[],
  progressByVideoId: ReadonlyMap<string, ProgressStatus>
): PlaylistProgressSummary {
  return videos.reduce<PlaylistProgressSummary>(
    (summary, video) => {
      if (!video.is_published) return summary

      const status = progressByVideoId.get(video.id)

      summary.totalCount += 1
      if (status === 'learning') summary.learningCount += 1
      if (status === 'completed') summary.completedCount += 1

      return summary
    },
    { totalCount: 0, learningCount: 0, completedCount: 0 }
  )
}

export function summarizePlaylistProgressFromRecord(
  videos: VideoLike[],
  progressByVideoId: Record<string, ProgressStatus>
) {
  return summarizePlaylistProgress(videos, new Map(Object.entries(progressByVideoId)))
}
