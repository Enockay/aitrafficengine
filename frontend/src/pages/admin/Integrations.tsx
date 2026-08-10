import { Loader2 } from 'lucide-react'

import { BrevoConfigCard } from '@/components/admin/BrevoConfigCard'
import { GeoipConfigCard } from '@/components/admin/GeoipConfigCard'
import { PaystackConfigCard } from '@/components/admin/PaystackConfigCard'
import { PlansConfigCard } from '@/components/admin/PlansConfigCard'
import { PlatformCredentialCard } from '@/components/admin/PlatformCredentialCard'
import { TrendsSection } from '@/components/admin/TrendsSection'
import { usePlatformCredentials } from '@/hooks/usePlatforms'

export default function AdminIntegrations() {
  const { data: credentials, isLoading, isError } = usePlatformCredentials()

  return (
    <div>
      <h1 className="mb-1 text-h1 text-text-primary">Integrations</h1>
      <p className="mb-6 text-body-sm text-text-secondary">
        Deployment-wide credentials — changes here take effect immediately, no restart needed.
      </p>

      <div className="mb-8">
        <p className="mb-3 text-body-sm font-medium text-text-primary">Billing & email</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PaystackConfigCard />
          <BrevoConfigCard />
          <PlansConfigCard />
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-3 text-body-sm font-medium text-text-primary">Platform credentials</p>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        )}
        {isError && <p className="py-12 text-center text-body-sm text-accent-red">Failed to load credentials.</p>}
        {credentials && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {credentials.map((status) => (
              <PlatformCredentialCard key={status.platform} status={status} canManage />
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <p className="mb-3 text-body-sm font-medium text-text-primary">Analytics</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GeoipConfigCard />
        </div>
      </div>

      <div>
        <p className="mb-3 text-body-sm font-medium text-text-primary">Trends</p>
        <TrendsSection />
      </div>
    </div>
  )
}
