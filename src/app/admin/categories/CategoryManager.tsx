'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

async function adminCategoriesRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
) {
  const response = await fetch('/api/admin/categories', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? '카테고리 작업에 실패했습니다')
  }

  return result.categories as MainCategory[]
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

export function CategoryManager({ initialCategories }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [draggingMainId, setDraggingMainId] = useState<string | null>(null)
  const [draggingSub, setDraggingSub] = useState<{ mainId: string; subId: string } | null>(null)

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

    try {
      const nextCategories = mainModal.editing
        ? await adminCategoriesRequest('PATCH', {
            entity: 'main',
            id: mainModal.editing.id,
            data: { name: mainForm.name, slug, description: mainForm.description },
          })
        : await adminCategoriesRequest('POST', {
            entity: 'main',
            data: {
              name: mainForm.name,
              slug,
              description: mainForm.description,
              sort_order: Math.max(0, ...categories.map((c) => c.sort_order)) + 1,
            },
          })

      setCategories(nextCategories)
      setMainModal({ open: false, editing: null })
      toast.success(mainModal.editing ? '수정되었습니다' : '추가되었습니다')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function deleteMainCategory(id: string) {
    if (!confirm('대카테고리를 삭제하면 하위 소카테고리와 영상도 모두 삭제됩니다. 계속하시겠습니까?')) return
    try {
      const nextCategories = await adminCategoriesRequest('DELETE', { entity: 'main', id })
      setCategories(nextCategories)
      toast.success('삭제되었습니다')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    }
  }

  // 소카테고리 저장
  async function saveSubCategory() {
    if (!subForm.name.trim()) return toast.error('이름을 입력하세요')
    setLoading(true)
    const slug = subForm.slug || slugify(subForm.name)

    try {
      const parent = categories.find((c) => c.id === subModal.parentId)
      const nextCategories = subModal.editing
        ? await adminCategoriesRequest('PATCH', {
            entity: 'sub',
            id: subModal.editing.id,
            data: { name: subForm.name, slug, description: subForm.description },
          })
        : await adminCategoriesRequest('POST', {
            entity: 'sub',
            data: {
              name: subForm.name,
              slug,
              description: subForm.description,
              main_category_id: subModal.parentId,
              sort_order: Math.max(0, ...(parent?.sub_categories?.map((s) => s.sort_order) ?? [])) + 1,
            },
          })

      setCategories(nextCategories)
      setSubModal({ open: false, editing: null, parentId: '' })
      toast.success(subModal.editing ? '수정되었습니다' : '추가되었습니다')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSubCategory(id: string) {
    if (!confirm('소카테고리를 삭제하면 하위 영상도 모두 삭제됩니다. 계속하시겠습니까?')) return
    try {
      const nextCategories = await adminCategoriesRequest('DELETE', { entity: 'sub', id })
      setCategories(nextCategories)
      toast.success('삭제되었습니다')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    }
  }

  async function moveMain(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= categories.length) return
    const a = categories[idx], b = categories[swapIdx]
    try {
      await adminCategoriesRequest('PATCH', {
        entity: 'main',
        id: a.id,
        data: { sort_order: b.sort_order },
      })
      const nextCategories = await adminCategoriesRequest('PATCH', {
        entity: 'main',
        id: b.id,
        data: { sort_order: a.sort_order },
      })
      setCategories(nextCategories)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다')
    }
  }

  async function moveSub(mainId: string, subId: string, direction: 'up' | 'down') {
    const main = categories.find((c) => c.id === mainId)
    const subs = main?.sub_categories ?? []
    const idx = subs.findIndex((s) => s.id === subId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= subs.length) return
    const a = subs[idx], b = subs[swapIdx]
    try {
      await adminCategoriesRequest('PATCH', {
        entity: 'sub',
        id: a.id,
        data: { sort_order: b.sort_order },
      })
      const nextCategories = await adminCategoriesRequest('PATCH', {
        entity: 'sub',
        id: b.id,
        data: { sort_order: a.sort_order },
      })
      setCategories(nextCategories)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다')
    }
  }

  async function persistMainOrder(nextCategories: MainCategory[]) {
    const normalized = nextCategories.map((category, index) => ({
      ...category,
      sort_order: index + 1,
    }))

    setCategories(normalized)
    try {
      const savedCategories = await adminCategoriesRequest('PATCH', {
        entity: 'main',
        items: normalized.map((category) => ({ id: category.id, sort_order: category.sort_order })),
      })
      setCategories(savedCategories)
      router.refresh()
    } catch (error) {
      setCategories(categories)
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다')
    }
  }

  async function persistSubOrder(mainId: string, nextSubs: SubCategory[]) {
    const normalizedSubs = nextSubs.map((sub, index) => ({
      ...sub,
      sort_order: index + 1,
    }))
    const previousCategories = categories
    const optimisticCategories = categories.map((category) =>
      category.id === mainId ? { ...category, sub_categories: normalizedSubs } : category
    )

    setCategories(optimisticCategories)
    try {
      const savedCategories = await adminCategoriesRequest('PATCH', {
        entity: 'sub',
        items: normalizedSubs.map((sub) => ({ id: sub.id, sort_order: sub.sort_order })),
      })
      setCategories(savedCategories)
      router.refresh()
    } catch (error) {
      setCategories(previousCategories)
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다')
    }
  }

  function handleMainDrop(targetId: string) {
    if (!draggingMainId || draggingMainId === targetId) return
    void persistMainOrder(reorderById(categories, draggingMainId, targetId))
    setDraggingMainId(null)
  }

  function handleSubDrop(mainId: string, targetSubId: string) {
    if (!draggingSub || draggingSub.mainId !== mainId || draggingSub.subId === targetSubId) return
    const main = categories.find((category) => category.id === mainId)
    const nextSubs = reorderById(main?.sub_categories ?? [], draggingSub.subId, targetSubId)
    void persistSubOrder(mainId, nextSubs)
    setDraggingSub(null)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">카테고리 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">대카테고리와 소카테고리를 관리합니다</p>
        </div>
        <Button onClick={() => { setMainForm({ name: '', slug: '', description: '' }); setMainModal({ open: true, editing: null }) }} className="gap-2">
          <Plus className="w-4 h-4" />
          대카테고리 추가
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((main, mainIdx) => (
          <Card
            key={main.id}
            className={`pt-4 transition-colors ${draggingMainId === main.id ? 'opacity-60' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleMainDrop(main.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span
                  draggable
                  className="cursor-grab active:cursor-grabbing"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    setDraggingMainId(main.id)
                  }}
                  onDragEnd={() => setDraggingMainId(null)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </span>
                <button onClick={() => toggleExpand(main.id)} className="flex items-center gap-1.5 flex-1 text-left">
                  {expanded.includes(main.id) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <CardTitle className="text-base">{main.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{main.slug}</Badge>
                  <span className="text-xs text-muted-foreground ml-1">({main.sub_categories?.length ?? 0}개 소카테고리)</span>
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
                    <div
                      key={sub.id}
                      className={`flex items-center gap-2 rounded-lg bg-muted/50 p-2 transition-colors ${draggingSub?.subId === sub.id ? 'opacity-60' : ''}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleSubDrop(main.id, sub.id)}
                    >
                      <span
                        draggable
                        className="cursor-grab active:cursor-grabbing"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          setDraggingSub({ mainId: main.id, subId: sub.id })
                        }}
                        onDragEnd={() => setDraggingSub(null)}
                      >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <span className="flex-1 text-sm text-foreground">{sub.name}</span>
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
                    className="w-full mt-2 border-dashed border-slate-300 text-muted-foreground hover:text-foreground"
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
