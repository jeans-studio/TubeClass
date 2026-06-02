import { createAdminClient } from '@/lib/supabase/admin'
import { UsersTable } from './UsersTable'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const userList = (users ?? []) as Profile[]
  const adminCount = userList.filter((user) => user.role === 'admin').length

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">가입 사용자</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 {userList.length.toLocaleString('ko-KR')}명 · 관리자 {adminCount.toLocaleString('ko-KR')}명
        </p>
      </div>

      <UsersTable users={userList} />
    </div>
  )
}
