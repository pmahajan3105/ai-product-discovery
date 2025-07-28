/**
 * Custom Fields Settings Page
 * Allows organization admins to manage custom field definitions
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { CustomFieldsManager } from '../../components/CustomFields';
import { authApi } from '../../lib/api';

export default function CustomFieldsSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authResponse = await authApi.getAuthStatus();
        if (!authResponse.success || !authResponse.data?.profile) {
          router.push('/auth');
          return;
        }

        const userProfile = authResponse.data.profile;
        setUser({
          name: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
          email: userProfile.email
        });

        // For now, use a mock organization ID
        // In a real app, this would come from the user's current organization
        setOrganization({ id: 'org_1', name: 'FeedbackHub' });
      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  if (loading || !user || !organization) {
    return (
      <DashboardLayout title="Loading..." user={user || { name: 'Loading...', email: '' }}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading custom fields settings...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Custom Fields" 
      user={user}
    >
      <CustomFieldsManager organizationId={organization.id} />
    </DashboardLayout>
  );
}