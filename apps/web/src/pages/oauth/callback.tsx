/**
 * OAuth Callback Page
 * Handles OAuth callbacks from integrated services
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';

export default function OAuthCallback() {
  const router = useRouter();
  const { user, organizationId } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    if (router.isReady && organizationId) {
      handleCallback();
    }
  }, [router.isReady, organizationId]);

  const handleCallback = async () => {
    try {
      const { code, state, error } = router.query;

      if (error) {
        setStatus('error');
        setMessage(`OAuth error: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      // The callback should have been processed by the backend
      // Just show success and redirect
      setStatus('success');
      setMessage('Integration connected successfully!');

      // Redirect to integrations page after a short delay
      setTimeout(() => {
        router.push('/integrations');
      }, 2000);

    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to process OAuth callback');
    }
  };

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout title="OAuth Callback" user={user}>
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Connecting Integration
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Integration Connected!
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting to integrations page...
              </p>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/integrations')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Integrations
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}