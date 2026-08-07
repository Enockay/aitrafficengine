import { useState } from 'react'
import { ChevronRight, Loader2, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { UserDetailDrawer } from '@/components/admin/UserDetailDrawer'
import { useAdminUsersQuery, type AdminUser } from '@/hooks/useAdminUsers'
import { getInitials } from '@/lib/utils'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('')
  const [roleFilter, setRoleFilter] = useState<'' | 'admin' | 'user'>('')
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null)

  const { data, isLoading, isError } = useAdminUsersQuery({
    search: search || undefined,
    role: roleFilter || undefined,
    is_active: statusFilter === '' ? undefined : statusFilter === 'true',
  })

  const users = data?.items ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-text-primary">Users</h1>
        {data && <p className="mt-0.5 text-caption text-text-muted">{data.total} total</p>}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'true' | 'false' | '')}>
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Suspended</option>
        </Select>
        <Select className="w-32" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'admin' | 'user' | '')}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">User</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Plan</th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Sites
              </th>
              <th className="px-4 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-muted">
                Posts
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Status</th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Joined</th>
              <th className="w-8 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  <Loader2 size={18} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-accent-red">
                  Failed to load users.
                </td>
              </tr>
            )}
            {!isLoading && !isError && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-secondary">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user, index) => (
              <tr
                key={user.id}
                onClick={() => setDetailUser(user)}
                className={`group cursor-pointer border-b border-border-default transition-colors last:border-0 hover:bg-bg-tertiary/60 ${
                  index % 2 === 1 ? 'bg-bg-secondary/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-caption font-semibold text-accent-purple">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-text-primary">
                        {user.full_name}
                        {user.role === 'admin' && (
                          <Badge variant="info" className="ml-2">
                            Admin
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-caption text-text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-body-sm capitalize text-text-secondary">{user.plan_code ?? '—'}</td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                  {user.sites_count}
                </td>
                <td className="px-4 py-3 text-right text-body-sm tabular-nums text-text-secondary">
                  {user.posts_count}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.is_active ? 'success' : 'error'}>
                    {user.is_active ? 'Active' : 'Suspended'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <ChevronRight
                    size={15}
                    className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailUser && <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />}
    </div>
  )
}
