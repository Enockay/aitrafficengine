import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { SupportWidget } from '@/components/support/SupportWidget'

export function PageLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <main className="mt-16 p-4 sm:p-6 lg:ml-[260px]">
        <Outlet />
      </main>
      <SupportWidget />
    </div>
  )
}
