import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLayout } from '@/components/layout/PageLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { useTelemetry } from '@/hooks/useTelemetry'
import { useAuthStore } from '@/stores/authStore'
import AdminBilling from '@/pages/admin/Billing'
import AdminIntegrations from '@/pages/admin/Integrations'
import AdminOverview from '@/pages/admin/Overview'
import AdminSchedules from '@/pages/admin/Schedules'
import AdminSites from '@/pages/admin/Sites'
import AdminTraffic from '@/pages/admin/Traffic'
import AdminUsers from '@/pages/admin/Users'
import About from '@/pages/About'
import Analytics from '@/pages/Analytics'
import Billing from '@/pages/Billing'
import Dashboard from '@/pages/Dashboard'
import Docs from '@/pages/Docs'
import Flyers from '@/pages/Flyers'
import ForgotPassword from '@/pages/ForgotPassword'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Pages from '@/pages/Pages'
import Platforms from '@/pages/Platforms'
import Posts from '@/pages/Posts'
import Pricing from '@/pages/Pricing'
import Privacy from '@/pages/Privacy'
import Register from '@/pages/Register'
import ResetPassword from '@/pages/ResetPassword'
import Scheduler from '@/pages/Scheduler'
import Settings from '@/pages/Settings'
import Sites from '@/pages/Sites'
import Terms from '@/pages/Terms'
import VerifyEmail from '@/pages/VerifyEmail'

const queryClient = new QueryClient()

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  useRealtimeEvents()
  useTelemetry(isAuthenticated)

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthHydrator>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<PageLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sites" element={<Sites />} />
                  <Route path="/pages" element={<Pages />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/flyers" element={<Flyers />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/scheduler" element={<Scheduler />} />
                  <Route path="/platforms" element={<Platforms />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/billing" element={<Billing />} />
                </Route>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/traffic" element={<AdminTraffic />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/billing" element={<AdminBilling />} />
                  <Route path="/admin/sites" element={<AdminSites />} />
                  <Route path="/admin/schedules" element={<AdminSchedules />} />
                  <Route path="/admin/integrations" element={<AdminIntegrations />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthHydrator>
          <Toaster theme="dark" position="bottom-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
