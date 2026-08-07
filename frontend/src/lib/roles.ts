import type { User } from '@/types/user'

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin'
}
