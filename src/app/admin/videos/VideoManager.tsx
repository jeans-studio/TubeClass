'use client'

import { useMemo, useState } from 'react'
import { extractYouTubeId } from '@/lib/youtube'
import type { MainCategory, Playlist, Video } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronRight, Download, Eye, EyeOff, FolderOpen, GripVertical, ListPlus, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type VideoWithRelations = Video & {
  playlist?: { id: string; name: string; slug: string; sub_category_id: string; difficulty?: VideoDifficulty | null } | null
  sub_category: { id: string; name: string; slug: string; main_category: { id: string; name: string; slug: string } }
}

type PlaylistWithCategory = Playlist & {
  sub_category: { id: string; name: string; slug: string; main_category: { id: string; name: string; slug: string } }
}

interface Props {
  initialVideos: VideoWithRelations[]
  initialPlaylists: PlaylistWithCategory[]
  categories: (MainCategory & { sub_categories: { id: string; name: string; slug: string }[] })[]
}

const emptyVideoForm = {
  title: '',
  description: '',
  youtube_url: '',
  playlist_id: '',
  is_published: true,
  duration: '',
  youtube_published_at: null as string | null,
  youtube_channel_name: '',
}

const emptyPlaylistForm = {
  name: '',
  slug: '',
  description: '',
  thumbnail_url: '',
  sub_category_id: '',
  difficulty: 'beginner' as VideoDifficulty,
  is_published: true,
}

interface YouTubeMetadata {
  youtube_id: string
  youtube_url: string
  title: string
  description: string
  duration: string
  youtube_published_at: string | null
  youtube_channel_name: string
  thumbnail_url: string
}

type VideoDifficulty = Video['difficulty']
type VideoSort = 'sort_order' | 'created_desc' | 'title_asc' | 'youtube_published_desc'

const difficultyLabels: Record<VideoDifficulty, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const sortLabels: Record<VideoSort, string> = {
  sort_order: '재생목록 순서',
  created_desc: '등록순',
  title_asc: '이름순',
  youtube_published_desc: '유튜브 원본 날짜순',
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function reorderById<T extends { id: string }>(items: T[], draggedId: string, targetId: string) {
  const fromIndex = items.findIndex((item) => item.id === draggedId)
  const toIndex = items.findIndex((item) => item.id === targetId)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items

  const nextItems = [...items]
  const [moved] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, moved)

  return nextItems
}

async function adminVideosRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
) {
  const response = await fetch('/api/admin/videos', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? '영상 작업에 실패했습니다')
  }

  return result.videos as VideoWithRelations[]
}

async function adminPlaylistsRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
) {
  const response = await fetch('/api/admin/playlists', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? '재생목록 작업에 실패했습니다')
  }

  return result.playlists as PlaylistWithCategory[]
}

async function fetchYouTubeMetadata(url: string) {
  const response = await fetch(`/api/admin/youtube-metadata?url=${encodeURIComponent(url)}`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'YouTube 메타데이터를 가져오지 못했습니다')
  }

  return result as YouTubeMetadata
}

async function importYouTubePlaylist(playlistId: string, youtubePlaylistUrl: string) {
  const response = await fetch('/api/admin/youtube-playlist-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playlist_id: playlistId,
      youtube_playlist_url: youtubePlaylistUrl,
    }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'YouTube 재생목록 가져오기에 실패했습니다')
  }

  return result as {
    imported: number
    skipped: number
    videos: VideoWithRelations[]
    playlists: PlaylistWithCategory[]
  }
}

export function VideoManager({ initialVideos, initialPlaylists, categories }: Props) {
  const [videos, setVideos] = useState(initialVideos)
  const [playlists, setPlaylists] = useState(initialPlaylists)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMainId, setFilterMainId] = useState('all')
  const [filterSubId, setFilterSubId] = useState('all')
  const [filterPlaylistId, setFilterPlaylistId] = useState('all')
  const [sortBy, setSortBy] = useState<VideoSort>('sort_order')
  const [videoModal, setVideoModal] = useState<{ open: boolean; editing: VideoWithRelations | null }>({ open: false, editing: null })
  const [playlistModal, setPlaylistModal] = useState<{ open: boolean; editing: PlaylistWithCategory | null }>({ open: false, editing: null })
  const [playlistImportModal, setPlaylistImportModal] = useState<{ open: boolean; playlist: PlaylistWithCategory | null }>({ open: false, playlist: null })
  const [videoForm, setVideoForm] = useState(emptyVideoForm)
  const [playlistForm, setPlaylistForm] = useState(emptyPlaylistForm)
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [draggingPlaylistId, setDraggingPlaylistId] = useState<string | null>(null)
  const [draggingVideoId, setDraggingVideoId] = useState<string | null>(null)

  const allSubs = useMemo(() =>
    categories.flatMap((main) =>
      (main.sub_categories ?? []).map((sub) => ({ ...sub, mainId: main.id, mainName: main.name }))
    ), [categories])

  const visiblePlaylists = useMemo(() => {
    return playlists.filter((playlist) => {
      const matchMain = filterMainId === 'all' || playlist.sub_category?.main_category?.id === filterMainId
      const matchSub = filterSubId === 'all' || playlist.sub_category_id === filterSubId
      return matchMain && matchSub
    })
  }, [playlists, filterMainId, filterSubId])

  const selectedMainLabel = categories.find((main) => main.id === filterMainId)?.name
  const selectedFilterSubLabel = allSubs.find((sub) => sub.id === filterSubId)
  const selectedFilterPlaylist = playlists.find((playlist) => playlist.id === filterPlaylistId)
  const selectedVideoPlaylist = playlists.find((playlist) => playlist.id === videoForm.playlist_id)
  const selectedPlaylistSubLabel = allSubs.find((sub) => sub.id === playlistForm.sub_category_id)

  const filtered = useMemo(() => {
    const result = videos.filter((video) => {
      const matchSearch = !search || video.title.toLowerCase().includes(search.toLowerCase())
      const matchMain = filterMainId === 'all' || video.sub_category?.main_category?.id === filterMainId
      const matchSub = filterSubId === 'all' || video.sub_category_id === filterSubId
      const matchPlaylist = filterPlaylistId === 'all' || video.playlist_id === filterPlaylistId
      return matchSearch && matchMain && matchSub && matchPlaylist
    })

    return [...result].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'ko')

      if (sortBy === 'youtube_published_desc') {
        const aTime = a.youtube_published_at ? new Date(a.youtube_published_at).getTime() : 0
        const bTime = b.youtube_published_at ? new Date(b.youtube_published_at).getTime() : 0
        return bTime - aTime
      }

      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      return a.sort_order - b.sort_order
    })
  }, [videos, search, filterMainId, filterSubId, filterPlaylistId, sortBy])

  const playlistVideoCounts = useMemo(() => {
    return videos.reduce<Record<string, number>>((acc, video) => {
      if (!video.playlist_id) return acc
      acc[video.playlist_id] = (acc[video.playlist_id] ?? 0) + 1
      return acc
    }, {})
  }, [videos])

  const selectedContextTitle = selectedFilterPlaylist?.name
    ?? selectedFilterSubLabel?.name
    ?? selectedMainLabel
    ?? '전체 영상'
  const selectedContextDescription = selectedFilterPlaylist
    ? `${selectedFilterPlaylist.sub_category?.main_category?.name} / ${selectedFilterPlaylist.sub_category?.name}`
    : selectedFilterSubLabel
      ? `${selectedFilterSubLabel.mainName} / ${selectedFilterSubLabel.name}`
      : selectedMainLabel
        ? `${selectedMainLabel} 전체`
        : '모든 카테고리'
  const selectedScopePlaylistCount = visiblePlaylists.length

  function selectMain(mainId: string) {
    setFilterMainId(mainId)
    setFilterSubId('all')
    setFilterPlaylistId('all')
  }

  function selectSub(mainId: string, subId: string) {
    setFilterMainId(mainId)
    setFilterSubId(subId)
    setFilterPlaylistId('all')
  }

  function selectPlaylist(playlist: PlaylistWithCategory) {
    setFilterMainId(playlist.sub_category?.main_category?.id ?? 'all')
    setFilterSubId(playlist.sub_category_id)
    setFilterPlaylistId(playlist.id)
  }

  function openPlaylistCreate() {
    setPlaylistForm({
      ...emptyPlaylistForm,
      sub_category_id: filterSubId === 'all' ? '' : filterSubId,
    })
    setPlaylistModal({ open: true, editing: null })
  }

  function openVideoCreateForPlaylist(playlistId: string) {
    setVideoForm({
      ...emptyVideoForm,
      playlist_id: playlistId,
    })
    setVideoModal({ open: true, editing: null })
  }

  async function handleUrlChange(url: string) {
    setVideoForm((form) => ({
      ...form,
      youtube_url: url,
      title: '',
      description: '',
      duration: '',
      youtube_published_at: null,
      youtube_channel_name: '',
    }))
    const id = extractYouTubeId(url)
    if (!id) return

    setUrlLoading(true)
    try {
      const metadata = await fetchYouTubeMetadata(url)
      setVideoForm((form) => {
        if (form.youtube_url !== url) return form
        return {
          ...form,
          youtube_url: metadata.youtube_url,
          title: metadata.title,
          description: metadata.description,
          duration: metadata.duration,
          youtube_published_at: metadata.youtube_published_at,
          youtube_channel_name: metadata.youtube_channel_name,
        }
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'YouTube 정보를 불러오지 못했습니다')
    } finally {
      setUrlLoading(false)
    }
  }

  async function savePlaylist() {
    if (!playlistForm.name.trim()) return toast.error('재생목록 이름을 입력하세요')
    if (!playlistForm.sub_category_id) return toast.error('소카테고리를 선택하세요')

    setLoading(true)
    try {
      const playlistData = {
        name: playlistForm.name.trim(),
        slug: playlistForm.slug.trim() || slugify(playlistForm.name),
        description: playlistForm.description.trim() || null,
        thumbnail_url: playlistForm.thumbnail_url.trim() || null,
        sub_category_id: playlistForm.sub_category_id,
        difficulty: playlistForm.difficulty,
        is_published: playlistForm.is_published,
      }

      const nextPlaylists = playlistModal.editing
        ? await adminPlaylistsRequest('PATCH', { id: playlistModal.editing.id, data: playlistData })
        : await adminPlaylistsRequest('POST', {
            data: {
              ...playlistData,
              sort_order: Math.max(0, ...playlists.filter((playlist) => playlist.sub_category_id === playlistForm.sub_category_id).map((playlist) => playlist.sort_order)) + 1,
            },
          })

      setPlaylists(nextPlaylists)
      setPlaylistModal({ open: false, editing: null })
      toast.success(playlistModal.editing ? '재생목록을 수정했습니다' : '재생목록을 만들었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '재생목록 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function saveVideo() {
    if (!videoForm.youtube_url.trim()) return toast.error('YouTube URL을 입력하세요')
    if (!videoForm.playlist_id) return toast.error('재생목록을 선택하세요')

    const youtube_id = extractYouTubeId(videoForm.youtube_url)
    if (!youtube_id) return toast.error('유효한 YouTube URL이 아닙니다')

    const playlist = playlists.find((item) => item.id === videoForm.playlist_id)
    if (!playlist) return toast.error('재생목록을 찾을 수 없습니다')

    setLoading(true)
    try {
      const metadata = videoForm.title && videoForm.youtube_published_at && videoForm.youtube_channel_name
        ? {
            youtube_id,
            youtube_url: videoForm.youtube_url,
            title: videoForm.title,
            description: videoForm.description,
            duration: videoForm.duration,
            youtube_published_at: videoForm.youtube_published_at,
            youtube_channel_name: videoForm.youtube_channel_name,
            thumbnail_url: `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`,
          }
        : await fetchYouTubeMetadata(videoForm.youtube_url)

      const videoData = {
        title: metadata.title,
        description: metadata.description,
        youtube_url: metadata.youtube_url,
        youtube_id: metadata.youtube_id,
        thumbnail_url: metadata.thumbnail_url,
        duration: metadata.duration,
        youtube_published_at: metadata.youtube_published_at,
        youtube_channel_name: metadata.youtube_channel_name,
        playlist_id: videoForm.playlist_id,
        sub_category_id: playlist.sub_category_id,
        difficulty: playlist.difficulty ?? 'beginner',
        is_published: videoForm.is_published,
      }

      const nextVideos = videoModal.editing
        ? await adminVideosRequest('PATCH', { id: videoModal.editing.id, data: videoData })
        : await adminVideosRequest('POST', {
            data: {
              ...videoData,
              sort_order: Math.max(0, ...videos.filter((video) => video.playlist_id === videoForm.playlist_id).map((video) => video.sort_order)) + 1,
            },
          })

      setVideos(nextVideos)
      setVideoModal({ open: false, editing: null })
      toast.success(videoModal.editing ? '수정되었습니다' : '추가되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function togglePlaylistPublish(playlist: PlaylistWithCategory) {
    try {
      const nextPlaylists = await adminPlaylistsRequest('PATCH', {
        id: playlist.id,
        data: { is_published: !playlist.is_published },
      })
      setPlaylists(nextPlaylists)
      toast.success(playlist.is_published ? '재생목록을 비공개로 변경했습니다' : '재생목록을 공개로 변경했습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다')
    }
  }

  async function toggleVideoPublish(video: Video) {
    try {
      const nextVideos = await adminVideosRequest('PATCH', {
        id: video.id,
        data: { is_published: !video.is_published },
      })
      setVideos(nextVideos)
      toast.success(video.is_published ? '비공개로 변경했습니다' : '공개로 변경했습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다')
    }
  }

  async function deletePlaylist(id: string) {
    if (!confirm('재생목록을 삭제하면 안의 영상도 함께 삭제됩니다. 삭제하시겠습니까?')) return
    try {
      const nextPlaylists = await adminPlaylistsRequest('DELETE', { id })
      setPlaylists(nextPlaylists)
      setVideos(await adminVideosRequest('GET'))
      if (filterPlaylistId === id) setFilterPlaylistId('all')
      toast.success('삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm('영상을 삭제하시겠습니까?')) return
    try {
      const nextVideos = await adminVideosRequest('DELETE', { id })
      setVideos(nextVideos)
      toast.success('삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    }
  }

  async function handlePlaylistImport() {
    if (!playlistImportModal.playlist) return
    if (!youtubePlaylistUrl.trim()) return toast.error('YouTube 재생목록 URL을 입력하세요')

    setLoading(true)
    try {
      const result = await importYouTubePlaylist(playlistImportModal.playlist.id, youtubePlaylistUrl.trim())
      setVideos(result.videos)
      setPlaylists(result.playlists)
      setPlaylistImportModal({ open: false, playlist: null })
      setYoutubePlaylistUrl('')
      toast.success(`${result.imported}개 영상을 가져왔습니다${result.skipped > 0 ? ` · 중복 ${result.skipped}개 제외` : ''}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'YouTube 재생목록 가져오기에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function moveVideo(id: string, direction: 'up' | 'down') {
    const current = videos.find((video) => video.id === id)
    const playlistVideos = videos
      .filter((video) => video.playlist_id === current?.playlist_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = playlistVideos.findIndex((video) => video.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= playlistVideos.length) return
    const a = playlistVideos[idx]
    const b = playlistVideos[swapIdx]

    try {
      await adminVideosRequest('PATCH', { id: a.id, data: { sort_order: b.sort_order } })
      const nextVideos = await adminVideosRequest('PATCH', { id: b.id, data: { sort_order: a.sort_order } })
      setVideos(nextVideos)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다')
    }
  }

  async function persistPlaylistOrder(nextSubPlaylists: PlaylistWithCategory[]) {
    const previousPlaylists = playlists
    const normalized = nextSubPlaylists.map((playlist, index) => ({
      ...playlist,
      sort_order: index + 1,
    }))
    const normalizedMap = new Map(normalized.map((playlist) => [playlist.id, playlist]))
    const optimisticPlaylists = playlists.map((playlist) => normalizedMap.get(playlist.id) ?? playlist)

    setPlaylists(optimisticPlaylists)
    try {
      const nextPlaylists = await adminPlaylistsRequest('PATCH', {
        items: normalized.map((playlist) => ({ id: playlist.id, sort_order: playlist.sort_order })),
      })
      setPlaylists(nextPlaylists)
      toast.success('재생목록 순서를 변경했습니다')
    } catch (error) {
      setPlaylists(previousPlaylists)
      toast.error(error instanceof Error ? error.message : '재생목록 순서 변경에 실패했습니다')
    }
  }

  function handlePlaylistDrop(targetPlaylist: PlaylistWithCategory) {
    if (!draggingPlaylistId || draggingPlaylistId === targetPlaylist.id) return

    const draggedPlaylist = playlists.find((playlist) => playlist.id === draggingPlaylistId)
    if (!draggedPlaylist) return

    if (draggedPlaylist.sub_category_id !== targetPlaylist.sub_category_id) {
      setDraggingPlaylistId(null)
      toast.error('재생목록 순서는 같은 소카테고리 안에서만 변경할 수 있습니다')
      return
    }

    const subPlaylists = playlists
      .filter((playlist) => playlist.sub_category_id === targetPlaylist.sub_category_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const nextSubPlaylists = reorderById(subPlaylists, draggingPlaylistId, targetPlaylist.id)

    void persistPlaylistOrder(nextSubPlaylists)
    setDraggingPlaylistId(null)
  }

  async function persistVideoOrder(playlistId: string, nextPlaylistVideos: VideoWithRelations[]) {
    const previousVideos = videos
    const normalized = nextPlaylistVideos.map((video, index) => ({
      ...video,
      sort_order: index + 1,
    }))
    const normalizedMap = new Map(normalized.map((video) => [video.id, video]))
    const optimisticVideos = videos.map((video) => normalizedMap.get(video.id) ?? video)

    setVideos(optimisticVideos)
    try {
      const nextVideos = await adminVideosRequest('PATCH', {
        items: normalized.map((video) => ({ id: video.id, sort_order: video.sort_order })),
      })
      setVideos(nextVideos)
      toast.success('영상 순서를 변경했습니다')
    } catch (error) {
      setVideos(previousVideos)
      toast.error(error instanceof Error ? error.message : '영상 순서 변경에 실패했습니다')
    }
  }

  function handleVideoDrop(targetVideo: VideoWithRelations) {
    if (!draggingVideoId || draggingVideoId === targetVideo.id) return

    if (sortBy !== 'sort_order') {
      setDraggingVideoId(null)
      toast.error('영상 순서 변경은 정렬을 재생목록 순서로 둔 상태에서만 가능합니다')
      return
    }

    const draggedVideo = videos.find((video) => video.id === draggingVideoId)
    if (!draggedVideo) return

    if (draggedVideo.playlist_id !== targetVideo.playlist_id || !targetVideo.playlist_id) {
      setDraggingVideoId(null)
      toast.error('영상 순서는 같은 재생목록 안에서만 변경할 수 있습니다')
      return
    }

    const playlistVideos = videos
      .filter((video) => video.playlist_id === targetVideo.playlist_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const nextPlaylistVideos = reorderById(playlistVideos, draggingVideoId, targetVideo.id)

    void persistVideoOrder(targetVideo.playlist_id, nextPlaylistVideos)
    setDraggingVideoId(null)
  }

  return (
    <div>
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">영상 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">소카테고리별 재생목록을 만들고, 그 안에 YouTube 영상을 추가합니다</p>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-13rem)] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h2 className="truncate text-sm font-semibold text-foreground">콘텐츠 구조</h2>
              </div>
              <Button variant="outline" size="sm" onClick={openPlaylistCreate} className="h-7 shrink-0 gap-1.5 px-2">
                <ListPlus className="h-3.5 w-3.5" />
                만들기
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterMainId('all')
                setFilterSubId('all')
                setFilterPlaylistId('all')
              }}
              className={`mt-3 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors ${filterMainId === 'all' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <span>전체 영상</span>
              <Badge variant="secondary" className="text-xs">{videos.length}</Badge>
            </button>
          </div>
          <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-3">
            <div className="space-y-3">
              {categories.map((main) => {
                const mainPlaylists = playlists.filter((playlist) => playlist.sub_category?.main_category?.id === main.id)
                const isMainActive = filterMainId === main.id && filterSubId === 'all'

                return (
                  <div key={main.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => selectMain(main.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors ${isMainActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                    >
                      <span className="truncate">{main.name}</span>
                      <Badge variant="outline" className="shrink-0 text-xs">{mainPlaylists.length}</Badge>
                    </button>

                    <div className="ml-3 space-y-1 border-l pl-3">
                      {main.sub_categories?.map((sub) => {
                        const subPlaylists = playlists
                          .filter((playlist) => playlist.sub_category_id === sub.id)
                          .sort((a, b) => a.sort_order - b.sort_order)
                        const isSubActive = filterSubId === sub.id && filterPlaylistId === 'all'

                        return (
                          <div key={sub.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => selectSub(main.id, sub.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${isSubActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                            >
                              <span className="truncate">{sub.name}</span>
                              <span className="shrink-0 opacity-70">{subPlaylists.length}</span>
                            </button>

                            <div className="ml-3 space-y-1">
                              {subPlaylists.map((playlist) => {
                                const isActive = filterPlaylistId === playlist.id

                                return (
                                  <div
                                    key={playlist.id}
                                    className={`group rounded-md transition-colors ${isActive ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-accent/70'} ${draggingPlaylistId === playlist.id ? 'opacity-60' : ''}`}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => handlePlaylistDrop(playlist)}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => selectPlaylist(playlist)}
                                      className="flex w-full min-w-0 items-center gap-1.5 px-2 py-1.5 text-left"
                                    >
                                      <span
                                        draggable
                                        className="shrink-0 cursor-grab active:cursor-grabbing"
                                        onClick={(event) => event.stopPropagation()}
                                        onDragStart={(event) => {
                                          event.stopPropagation()
                                          event.dataTransfer.effectAllowed = 'move'
                                          setDraggingPlaylistId(playlist.id)
                                        }}
                                        onDragEnd={() => setDraggingPlaylistId(null)}
                                      >
                                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className={`truncate text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{playlist.name}</p>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                          <span>{playlistVideoCounts[playlist.id] ?? 0}개</span>
                                          <span>·</span>
                                          <span>{difficultyLabels[playlist.difficulty ?? 'beginner']}</span>
                                          {!playlist.is_published && <span>· 비공개</span>}
                                        </div>
                                      </div>
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    </button>
                                  </div>
                                )
                              })}
                              {subPlaylists.length === 0 && (
                                <p className="px-2 py-1 text-[11px] text-muted-foreground">재생목록 없음</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{selectedContextDescription}</span>
                  <span>·</span>
                  <span>{selectedScopePlaylistCount}개 재생목록</span>
                  <span>·</span>
                  <span>{filtered.length}개 영상</span>
                </div>
                <h2 className="mt-1 truncate text-xl font-semibold text-foreground">{selectedContextTitle}</h2>
              </div>

              {selectedFilterPlaylist && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openVideoCreateForPlaylist(selectedFilterPlaylist.id)}>
                    <Plus className="h-3.5 w-3.5" />
                    영상 추가
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setYoutubePlaylistUrl('')
                      setPlaylistImportModal({ open: true, playlist: selectedFilterPlaylist })
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    가져오기
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => togglePlaylistPublish(selectedFilterPlaylist)}>
                    {selectedFilterPlaylist.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {selectedFilterPlaylist.is_published ? '공개' : '비공개'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setPlaylistForm({
                      name: selectedFilterPlaylist.name,
                      slug: selectedFilterPlaylist.slug,
                      description: selectedFilterPlaylist.description ?? '',
                      thumbnail_url: selectedFilterPlaylist.thumbnail_url ?? '',
                      sub_category_id: selectedFilterPlaylist.sub_category_id,
                      difficulty: selectedFilterPlaylist.difficulty ?? 'beginner',
                      is_published: selectedFilterPlaylist.is_published,
                    })
                    setPlaylistModal({ open: true, editing: selectedFilterPlaylist })
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePlaylist(selectedFilterPlaylist.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="선택한 범위 안에서 제목으로 검색"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy((value ?? 'sort_order') as VideoSort)}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="정렬">{sortLabels[sortBy]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sort_order">재생목록 순서</SelectItem>
                  <SelectItem value="created_desc">등록순</SelectItem>
                  <SelectItem value="title_asc">이름순</SelectItem>
                  <SelectItem value="youtube_published_desc">유튜브 원본 날짜순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">순서</TableHead>
                  <TableHead className="w-20">썸네일</TableHead>
                  <TableHead className="w-[32%] min-w-0">제목</TableHead>
                  <TableHead className="w-[34%]">재생목록</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-14 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      영상이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((video, idx) => (
                    <TableRow
                      key={video.id}
                      className={draggingVideoId === video.id ? 'opacity-60' : undefined}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleVideoDrop(video)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span
                            draggable
                            className="cursor-grab active:cursor-grabbing"
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'move'
                              setDraggingVideoId(video.id)
                            }}
                            onDragEnd={() => setDraggingVideoId(null)}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveVideo(video.id, 'up')} disabled={idx === 0}>↑</Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveVideo(video.id, 'down')} disabled={idx === filtered.length - 1}>↓</Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {video.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnail_url} alt={video.title} className="h-9 w-16 rounded object-cover" />
                        )}
                      </TableCell>
                      <TableCell className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {video.duration && <span>{video.duration}</span>}
                          {video.youtube_published_at && <span>원본 {new Date(video.youtube_published_at).toLocaleDateString('ko-KR')}</span>}
                          {video.youtube_channel_name && <span>출처 {video.youtube_channel_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-xs text-muted-foreground">{video.sub_category?.main_category?.name} / {video.sub_category?.name}</span>
                          <div className="flex min-w-0 flex-wrap gap-1">
                            <Badge variant="secondary" className="max-w-full truncate text-xs">{video.playlist?.name ?? '재생목록 없음'}</Badge>
                            <Badge variant="outline" className="w-fit text-xs">
                              {difficultyLabels[video.playlist?.difficulty ?? video.difficulty ?? 'beginner']}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2" onClick={() => toggleVideoPublish(video)}>
                          {video.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {video.is_published ? '공개' : '비공개'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setVideoForm({
                              title: video.title,
                              description: video.description ?? '',
                              youtube_url: video.youtube_url,
                              playlist_id: video.playlist_id ?? '',
                              is_published: video.is_published,
                              duration: video.duration ?? '',
                              youtube_published_at: video.youtube_published_at,
                              youtube_channel_name: video.youtube_channel_name ?? '',
                            })
                            setVideoModal({ open: true, editing: video })
                          }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVideo(video.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={playlistModal.open} onOpenChange={(open) => setPlaylistModal({ open, editing: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{playlistModal.editing ? '재생목록 수정' : '재생목록 만들기'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>소카테고리 *</Label>
              <Select value={playlistForm.sub_category_id} onValueChange={(value) => setPlaylistForm({ ...playlistForm, sub_category_id: value ?? '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="소카테고리 선택">
                    {selectedPlaylistSubLabel ? `${selectedPlaylistSubLabel.mainName} / ${selectedPlaylistSubLabel.name}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((main) => (
                    <div key={main.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{main.name}</div>
                      {main.sub_categories?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id} className="pl-4">{sub.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>재생목록 이름 *</Label>
              <Input
                value={playlistForm.name}
                onChange={(event) => setPlaylistForm({
                  ...playlistForm,
                  name: event.target.value,
                  slug: playlistModal.editing ? playlistForm.slug : slugify(event.target.value),
                })}
                placeholder="예: 입문자를 위한 기본 강의"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={playlistForm.description}
                onChange={(event) => setPlaylistForm({ ...playlistForm, description: event.target.value })}
                placeholder="재생목록 설명"
              />
            </div>
            <div className="space-y-2">
              <Label>이미지 URL</Label>
              <Input
                value={playlistForm.thumbnail_url}
                onChange={(event) => setPlaylistForm({ ...playlistForm, thumbnail_url: event.target.value })}
                placeholder="https://..."
              />
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {playlistForm.thumbnail_url.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playlistForm.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    16:9 이미지 미리보기
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>난이도 *</Label>
              <Select
                value={playlistForm.difficulty}
                onValueChange={(value) => setPlaylistForm({ ...playlistForm, difficulty: (value ?? 'beginner') as VideoDifficulty })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="난이도 선택">{difficultyLabels[playlistForm.difficulty]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급</SelectItem>
                  <SelectItem value="intermediate">중급</SelectItem>
                  <SelectItem value="advanced">고급</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PublishToggle
              value={playlistForm.is_published}
              onChange={(value) => setPlaylistForm({ ...playlistForm, is_published: value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaylistModal({ open: false, editing: null })}>취소</Button>
            <Button onClick={savePlaylist} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={videoModal.open} onOpenChange={(open) => setVideoModal({ open, editing: null })}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>{videoModal.editing ? '영상 수정' : '영상 추가'}</DialogTitle>
          </DialogHeader>
          <div className="min-w-0 space-y-4 py-2">
            <div className="min-w-0 space-y-2">
              <Label>YouTube URL *</Label>
              <div className="flex min-w-0 gap-2">
                <Input
                  value={videoForm.youtube_url}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="min-w-0 flex-1"
                />
                {urlLoading && <Loader2 className="mt-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {videoForm.youtube_url && extractYouTubeId(videoForm.youtube_url) && (
                <div className="aspect-video w-full overflow-hidden rounded bg-muted">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(videoForm.youtube_url) as string}`}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              )}
              {videoForm.title && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">{videoForm.title}</p>
                  {videoForm.duration && <p className="mt-1 text-xs text-muted-foreground">{videoForm.duration}</p>}
                  {videoForm.youtube_channel_name && <p className="mt-1 text-xs text-muted-foreground">출처 {videoForm.youtube_channel_name}</p>}
                  {videoForm.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{videoForm.description}</p>}
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <Label>재생목록 *</Label>
              <Select value={videoForm.playlist_id} onValueChange={(value) => setVideoForm({ ...videoForm, playlist_id: value ?? '' })}>
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue placeholder="재생목록 선택" className="min-w-0 overflow-hidden">
                    {selectedVideoPlaylist ? (
                      <span className="block min-w-0 truncate">
                        {selectedVideoPlaylist.sub_category?.main_category?.name} / {selectedVideoPlaylist.sub_category?.name} / {selectedVideoPlaylist.name}
                      </span>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.sub_category?.main_category?.name} / {playlist.sub_category?.name} / {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PublishToggle
              value={videoForm.is_published}
              onChange={(value) => setVideoForm({ ...videoForm, is_published: value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoModal({ open: false, editing: null })}>취소</Button>
            <Button onClick={saveVideo} disabled={loading || urlLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={playlistImportModal.open} onOpenChange={(open) => {
        setPlaylistImportModal({ open, playlist: open ? playlistImportModal.playlist : null })
        if (!open) setYoutubePlaylistUrl('')
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>YouTube 재생목록 가져오기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{playlistImportModal.playlist?.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                공개 영상만 가져오며, 이미 등록된 영상은 중복 제외됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label>YouTube 재생목록 URL *</Label>
              <Input
                value={youtubePlaylistUrl}
                onChange={(event) => setYoutubePlaylistUrl(event.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
              />
              <p className="text-xs text-muted-foreground">
                YouTube Data API 키가 필요합니다. .env.local에 YOUTUBE_API_KEY를 추가한 뒤 서버를 재시작하세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPlaylistImportModal({ open: false, playlist: null })
                setYoutubePlaylistUrl('')
              }}
            >
              취소
            </Button>
            <Button onClick={handlePlaylistImport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              가져오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PublishToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="space-y-2">
      <Label>상태 *</Label>
      <div className="inline-flex h-8 rounded-lg bg-muted p-[3px]">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
            value
              ? 'bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          공개
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
            !value
              ? 'bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" />
          비공개
        </button>
      </div>
    </div>
  )
}
