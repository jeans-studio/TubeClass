import { createClient } from '@/lib/supabase/server'
import { CategoryManager } from './CategoryManager'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('main_categories')
    .select('*, sub_categories(id, name, slug, sort_order, description, main_category_id, created_at, updated_at)')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'sub_categories' })

  return <CategoryManager initialCategories={categories ?? []} />
}
