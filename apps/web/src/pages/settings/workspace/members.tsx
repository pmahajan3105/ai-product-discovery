/**
 * Workspace Members Settings Page
 * Member management with invitation system and role assignment
 * Based on Zeda's member management patterns
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../components/Layout/DashboardLayout';
import { SettingsLayout } from '../../../components/Settings/SettingsLayout';
import { WorkspaceMembersSettings } from '../../../components/Settings/Workspace/WorkspaceMembersSettings';
import { authApi } from '../../../lib/api';

export default function WorkspaceMembersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const authResponse = await authApi.getAuthStatus();
        if (!authResponse.success || !authResponse.data?.profile) {
          router.push('/auth');
          return;
        }

        const userProfile = authResponse.data.profile;
        setUser({
          id: userProfile.id || 'user-id',
          name: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName
        });

        setOrganization({ 
          id: 'org_1', 
          name: 'FeedbackHub',
          slug: 'feedbackhub',
          domain: 'feedbackhub.com',
          plan: 'professional',
          status: 'active'
        });

      } catch (error) {
        console.error('Error loading data:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout title="Loading..." user={user || { name: 'Loading...', email: '' }}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !organization) {
    return null;
  }

  return (
    <DashboardLayout title="Members - Settings" user={user}>
      <SettingsLayout 
        user={user} 
        organization={organization}
        activeSection="workspace"
        activeSubSection="members"
      >
        <WorkspaceMembersSettings 
          organization={organization}
          user={user}
        />
      </SettingsLayout>
    </DashboardLayout>
  );
}