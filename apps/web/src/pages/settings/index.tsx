/**
 * Main Settings Page
 * Entry point for organization and workspace settings
 * Based on Zeda's comprehensive settings architecture
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { SettingsLayout } from '../../components/Settings/SettingsLayout';
import { WorkspaceGeneralSettings } from '../../components/Settings/Workspace/WorkspaceGeneralSettings';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';

export default function SettingsPage() {
  const router = useRouter();
  const { user, organizationId } = useAuth();
  const { currentOrganization, isLoading, error } = useOrganization();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (isLoading || !user || !organizationId) {
    return (
      <DashboardLayout title="Settings" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !currentOrganization) {
    return (
      <DashboardLayout title="Settings" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error loading organization settings</p>
            <button 
              onClick={() => router.reload()}
              className="mt-2 text-sm text-indigo-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" user={user}>
      <SettingsLayout 
        user={user} 
        organization={currentOrganization}
        activeSection="workspace"
        activeSubSection="general"
      >
        <WorkspaceGeneralSettings 
          organization={currentOrganization}
          user={user}
        />
      </SettingsLayout>
    </DashboardLayout>
  );
}