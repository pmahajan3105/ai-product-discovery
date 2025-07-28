/**
 * Profile Settings Page
 * Personal account and profile management
 * Based on Zeda's profile settings patterns
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { SettingsLayout } from '../../components/Settings/SettingsLayout';
import { ProfileSettings } from '../../components/Settings/Profile/ProfileSettings';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization, isLoading } = useOrganization();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Profile Settings" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile - Settings" user={user}>
      <SettingsLayout 
        user={user} 
        organization={currentOrganization}
        activeSection="profile"
        activeSubSection="profile"
      >
        <ProfileSettings user={user} />
      </SettingsLayout>
    </DashboardLayout>
  );
}