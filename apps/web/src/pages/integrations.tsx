import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { IntegrationsPage } from '../components/Integrations/IntegrationsPage';
import { useAuth } from '../hooks/useAuth';
import { initializeIntegrations } from '../lib/integrations/registry';

export default function Integrations() {
  const router = useRouter();
  const { user, organizationId } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    // Initialize integrations when the page loads
    if (organizationId) {
      initializeIntegrations();
    }
  }, [organizationId]);

  // Show loading if not authenticated or no organization
  if (!user || !organizationId) {
    return (
      <DashboardLayout title="Integrations" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Integrations" 
      user={user}
    >
      <IntegrationsPage organizationId={organizationId} />
    </DashboardLayout>
  );
}