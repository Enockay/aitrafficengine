import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { useAuthStore } from '@/stores/authStore'
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
import Privacy from '@/pages/Privacy'
import Register from '@/pages/Register'
import ResetPassword from '@/pages/ResetPassword'
import Scheduler from '@/pages/Scheduler'
import Settings from '@/pages/Settings'
import Sites from '@/pages/Sites'
import VerifyEmail from '@/pages/VerifyEmail'

const queryClient = new QueryClient()

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  useRealtimeEvents()

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthHydrator>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthHydrator>
        <Toaster theme="dark" position="bottom-right" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
