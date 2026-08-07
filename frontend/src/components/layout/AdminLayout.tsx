import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { AdminHeader } from '@/components/layout/AdminHeader'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/lib/roles'

export function AdminLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAdmin(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
      <main className="mt-16 p-4 sm:p-6 lg:ml-[260px]">
        <Outlet />
      </main>
    </div>
  )
}
