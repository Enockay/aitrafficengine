import { Navigate, Outlet } from 'react-router-dom'

import { PageLayout } from '@/components/layout/PageLayout'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <PageLayout>
      <Outlet />
    </PageLayout>
  )
}
