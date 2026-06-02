'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MainCategory, SubCategory } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialCategories: MainCategory[]
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export function CategoryManager({ initialCategories }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState(initialCategories)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 대카테고리 모달
  const [mainModal, setMainModal] = useState<{ open: boolean; editing: MainCategory | null }>({ open: false, editing: null })
  const [mainForm, setMainForm] = useState({ name: '', slug: '', description: '' })

  // 소카테고리 모달
  const [subModal, setSubModal] = useState<{ open: boolean; editing: SubCategory | null; parentId: string }>({ open: false, editing: null, parentId: '' })
  const [subForm, setSubForm] = useState({ name: '', slug: '', description: '' })

  function toggleExpand(id: string) {
    setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  // 대카테고리 저장
  async function saveMainCategory() {
    if (!mainForm.name.trim()) return toast.error('이름을 입력하세요')
    setLoading(true)
    const slug = mainForm.slug || slugify(mainForm.name)

    if (mainModal.editing) {
      const { error } = await supabase
        .from('main_categories')
        .update({ name: mainForm.name, slug, description: mainForm.description })
        .eq('id', mainModal.editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('수정되었습니다')
    } else {
      const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order)) + 1
      const { error } = await supabase
        .from('main_categories')
        .insert({ name: mainForm.name, slug, description: mainForm.description, sort_order: maxOrder })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('추가되었습니다')
    }

    setMainModal({ open: false, editing: null })
    setLoading(false)
    router.refresh()
    // 클라이언트 갱신
    const { data } = await supabase.from('main_categories').select('*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)').order('sort_order').order('sort_order', { referencedTable: 'sub_categories' })
    if (data) setCategories(data)
  }

  async function deleteMainCategory(id: string) {
    if (!confirm('대카테고리를 삭제하면 하위 소카테고리와 영상도 모두 삭제됩니다. 계속하시겠습니까?')) return
    const { error } = await supabase.from('main_categories').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('삭제되었습니다')
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  // 소카테고리 저장
  async function saveSubCategory() {
    if (!subForm.name.trim()) return toast.error('이름을 입력하세요')
    setLoading(true)
    const slug = subForm.slug || slugify(subForm.name)

    if (subModal.editing) {
      const { error } = await supabase
        .from('sub_categories')
        .update({ name: subForm.name, slug, description: subForm.description })
        .eq('id', subModal.editing.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('수정되었습니다')
    } else {
      const parent = categories.find((c) => c.id === subModal.parentId)
      const maxOrder = Math.max(0, ...(parent?.sub_categories?.map((s) => s.sort_order) ?? [])) + 1
      const { error } = await supabase
        .from('sub_categories')
        .insert({ name: subForm.name, slug, description: subForm.description, main_category_id: subModal.parentId, sort_order: maxOrder })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('추가되었습니다')
    }

    setSubModal({ open: false, editing: null, parentId: '' })
    setLoading(false)
    const { data } = await supabase.from('main_categories').select('*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)').order('sort_order').order('sort_order', { referencedTable: 'sub_categories' })
    if (data) setCategories(data)
  }

  async function deleteSubCategory(id: string) {
    if (!confirm('소카테고리를 삭제하면 하위 영상도 모두 삭제됩니다. 계속하시겠습니까?')) return
    const { error } = await supabase.from('sub_categories').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('삭제되었습니다')
    const { data } = await supabase.from('main_categories').select('*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)').order('sort_order').order('sort_order', { referencedTable: 'sub_categories' })
    if (data) setCategories(data)
  }

  async function moveMain(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= categories.length) return
    const a = categories[idx], b = categories[swapIdx]
    await Promise.all([
      supabase.from('main_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('main_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    const newCats = [...categories]
    newCats[idx] = { ...a, sort_order: b.sort_order }
    newCats[swapIdx] = { ...b, sort_order: a.sort_order }
    setCategories(newCats.sort((x, y) => x.sort_order - y.sort_order))
  }

  async function moveSub(mainId: string, subId: string, direction: 'up' | 'down') {
    const main = categories.find((c) => c.id === mainId)
    const subs = main?.sub_categories ?? []
    const idx = subs.findIndex((s) => s.id === subId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= subs.length) return
    const a = subs[idx], b = subs[swapIdx]
    await Promise.all([
      supabase.from('sub_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('sub_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    const { data } = await supabase.from('main_categories').select('*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)').order('sort_order').order('sort_order', { referencedTable: 'sub_categories' })
    if (data) setCategories(data)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">카테고리 관리</h1>
          <p className="text-sm text-slate-500 mt-1">대카테고리와 소카테고리를 관리합니다</p>
        </div>
        <Button onClick={() => { setMainForm({ name: '', slug: '', description: '' }); setMainModal({ open: true, editing: null }) }} className="gap-2">
          <Plus className="w-4 h-4" />
          대카테고리 추가
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((main, mainIdx) => (
          <Card key={main.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-300" />
                <button onClick={() => toggleExpand(main.id)} className="flex items-center gap-1.5 flex-1 text-left">
                  {expanded.includes(main.id) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <CardTitle className="text-base">{main.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{main.slug}</Badge>
                  <span className="text-xs text-slate-400 ml-1">({main.sub_categories?.length ?? 0}개 소카테고리)</span>
                </button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMain(main.id, 'up')} disabled={mainIdx === 0}>↑</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMain(main.id, 'down')} disabled={mainIdx === categories.length - 1}>↓</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setMainForm({ name: main.name, slug: main.slug, description: main.description ?? '' }); setMainModal({ open: true, editing: main }) }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteMainCategory(main.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expanded.includes(main.id) && (
              <CardContent className="pt-0">
                <div className="ml-8 space-y-2">
                  {main.sub_categories?.map((sub, subIdx) => (
                    <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                      <span className="flex-1 text-sm text-slate-700">{sub.name}</span>
                      <Badge variant="outline" className="text-xs">{sub.slug}</Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSub(main.id, sub.id, 'up')} disabled={subIdx === 0}>↑</Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSub(main.id, sub.id, 'down')} disabled={subIdx === (main.sub_categories?.length ?? 1) - 1}>↓</Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSubForm({ name: sub.name, slug: sub.slug, description: sub.description ?? '' }); setSubModal({ open: true, editing: sub, parentId: main.id }) }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteSubCategory(sub.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700"
                    onClick={() => { setSubForm({ name: '', slug: '', description: '' }); setSubModal({ open: true, editing: null, parentId: main.id }) }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    소카테고리 추가
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* 대카테고리 모달 */}
      <Dialog open={mainModal.open} onOpenChange={(o) => setMainModal({ open: o, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mainModal.editing ? '대카테고리 수정' : '대카테고리 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input value={mainForm.name} onChange={(e) => setMainForm({ ...mainForm, name: e.target.value })} placeholder="예: 언어" />
            </div>
            <div className="space-y-2">
              <Label>슬러그 (영문, 비워두면 자동 생성)</Label>
              <Input value={mainForm.slug} onChange={(e) => setMainForm({ ...mainForm, slug: e.target.value })} placeholder="예: language" />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea value={mainForm.description} onChange={(e) => setMainForm({ ...mainForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMainModal({ open: false, editing: null })}>취소</Button>
            <Button onClick={saveMainCategory} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 소카테고리 모달 */}
      <Dialog open={subModal.open} onOpenChange={(o) => setSubModal({ open: o, editing: null, parentId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subModal.editing ? '소카테고리 수정' : '소카테고리 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} placeholder="예: 영어" />
            </div>
            <div className="space-y-2">
              <Label>슬러그 (영문, 비워두면 자동 생성)</Label>
              <Input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} placeholder="예: english" />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubModal({ open: false, editing: null, parentId: '' })}>취소</Button>
            <Button onClick={saveSubCategory} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
