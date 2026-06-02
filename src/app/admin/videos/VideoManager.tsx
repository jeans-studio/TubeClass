'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube'
import type { Video, MainCategory } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2, Search, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialVideos: (Video & { sub_category: { id: string; name: string; slug: string; main_category: { id: string; name: string; slug: string } } })[]
  categories: (MainCategory & { sub_categories: { id: string; name: string; slug: string }[] })[]
}

const emptyForm = { title: '', description: '', youtube_url: '', sub_category_id: '', duration: '' }

export function VideoManager({ initialVideos, categories }: Props) {
  const supabase = createClient()
  const [videos, setVideos] = useState(initialVideos)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSubId, setFilterSubId] = useState('all')

  const [modal, setModal] = useState<{ open: boolean; editing: Video | null }>({ open: false, editing: null })
  const [form, setForm] = useState(emptyForm)
  const [urlLoading, setUrlLoading] = useState(false)

  const allSubs = useMemo(() =>
    categories.flatMap((m) =>
      (m.sub_categories ?? []).map((s) => ({ ...s, mainName: m.name }))
    ), [categories])

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase())
      const matchSub = filterSubId === 'all' || v.sub_category_id === filterSubId
      return matchSearch && matchSub
    })
  }, [videos, search, filterSubId])

  async function handleUrlChange(url: string) {
    setForm((f) => ({ ...f, youtube_url: url }))
    const id = extractYouTubeId(url)
    if (!id) return
    setUrlLoading(true)
    // oEmbed로 제목 자동 추출
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      if (res.ok) {
        const data = await res.json()
        setForm((f) => ({ ...f, title: f.title || data.title }))
      }
    } catch {}
    setUrlLoading(false)
  }

  async function saveVideo() {
    if (!form.title.trim()) return toast.error('제목을 입력하세요')
    if (!form.youtube_url.trim()) return toast.error('YouTube URL을 입력하세요')
    if (!form.sub_category_id) return toast.error('소카테고리를 선택하세요')

    const youtube_id = extractYouTubeId(form.youtube_url)
    if (!youtube_id) return toast.error('유효한 YouTube URL이 아닙니다')

    setLoading(true)
    const thumbnail_url = getYouTubeThumbnail(youtube_id)

    if (modal.editing) {
      const { error } = await supabase
        .from('videos')
        .update({
          title: form.title,
          description: form.description,
          youtube_url: form.youtube_url,
          youtube_id,
          thumbnail_url,
          duration: form.duration,
          sub_category_id: form.sub_category_id,
        })
        .eq('id', modal.editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('수정되었습니다')
    } else {
      const maxOrder = Math.max(0, ...videos.filter((v) => v.sub_category_id === form.sub_category_id).map((v) => v.sort_order)) + 1
      const { error } = await supabase
        .from('videos')
        .insert({
          title: form.title,
          description: form.description,
          youtube_url: form.youtube_url,
          youtube_id,
          thumbnail_url,
          duration: form.duration,
          sub_category_id: form.sub_category_id,
          sort_order: maxOrder,
          is_published: true,
        })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('추가되었습니다')
    }

    setModal({ open: false, editing: null })
    setLoading(false)
    const { data } = await supabase
      .from('videos')
      .select('*, sub_category:sub_categories(id, name, slug, main_category:main_categories(id, name, slug))')
      .order('sort_order')
    if (data) setVideos(data as typeof videos)
  }

  async function togglePublish(video: Video) {
    const { error } = await supabase
      .from('videos')
      .update({ is_published: !video.is_published })
      .eq('id', video.id)
    if (error) { toast.error(error.message); return }
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_published: !v.is_published } : v))
    toast.success(video.is_published ? '비공개로 변경했습니다' : '공개로 변경했습니다')
  }

  async function deleteVideo(id: string) {
    if (!confirm('영상을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('videos').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('삭제되었습니다')
    setVideos((prev) => prev.filter((v) => v.id !== id))
  }

  async function moveVideo(id: string, direction: 'up' | 'down') {
    const subVideos = videos.filter((v) => v.sub_category_id === videos.find((x) => x.id === id)?.sub_category_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = subVideos.findIndex((v) => v.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= subVideos.length) return
    const a = subVideos[idx], b = subVideos[swapIdx]
    await Promise.all([
      supabase.from('videos').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('videos').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    setVideos((prev) => prev.map((v) => {
      if (v.id === a.id) return { ...v, sort_order: b.sort_order }
      if (v.id === b.id) return { ...v, sort_order: a.sort_order }
      return v
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">영상 관리</h1>
          <p className="text-sm text-slate-500 mt-1">YouTube 영상을 추가하고 관리합니다</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setModal({ open: true, editing: null }) }} className="gap-2">
          <Plus className="w-4 h-4" />
          영상 추가
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="제목으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterSubId} onValueChange={(v) => setFilterSubId(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="소카테고리 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {allSubs.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.mainName} / {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-10">순서</TableHead>
              <TableHead className="w-20">썸네일</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="w-16">상태</TableHead>
              <TableHead className="w-28 text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  영상이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((video, idx) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveVideo(video.id, 'up')} disabled={idx === 0}>↑</Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveVideo(video.id, 'down')} disabled={idx === filtered.length - 1}>↓</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {video.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnail_url} alt={video.title} className="w-16 h-9 object-cover rounded" />
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{video.title}</p>
                    {video.duration && <span className="text-xs text-slate-400">{video.duration}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400">{video.sub_category?.main_category?.name}</span>
                      <Badge variant="secondary" className="text-xs w-fit">{video.sub_category?.name}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={video.is_published ? 'default' : 'secondary'}>
                      {video.is_published ? '공개' : '비공개'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(video)} title={video.is_published ? '비공개' : '공개'}>
                        {video.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setForm({ title: video.title, description: video.description ?? '', youtube_url: video.youtube_url, sub_category_id: video.sub_category_id, duration: video.duration ?? '' })
                        setModal({ open: true, editing: video })
                      }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteVideo(video.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 영상 모달 */}
      <Dialog open={modal.open} onOpenChange={(o) => setModal({ open: o, editing: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal.editing ? '영상 수정' : '영상 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>YouTube URL *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.youtube_url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1"
                />
                {urlLoading && <Loader2 className="w-4 h-4 animate-spin mt-2.5 text-slate-400" />}
              </div>
              {form.youtube_url && extractYouTubeId(form.youtube_url) && (
                <div className="w-full aspect-video rounded overflow-hidden bg-slate-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(form.youtube_url) as string}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="영상 제목" />
            </div>
            <div className="space-y-2">
              <Label>소카테고리 *</Label>
              <Select value={form.sub_category_id} onValueChange={(v) => setForm({ ...form, sub_category_id: v ?? '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="소카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((main) => (
                    <div key={main.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">{main.name}</div>
                      {main.sub_categories?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id} className="pl-4">
                          {sub.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>영상 길이 (선택)</Label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="예: 15:30" />
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal({ open: false, editing: null })}>취소</Button>
            <Button onClick={saveVideo} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
