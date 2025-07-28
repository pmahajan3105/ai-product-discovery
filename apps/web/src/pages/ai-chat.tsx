/**
 * AI Chat Page
 * Simple chat interface for testing AI functionality
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { AIChatInterface } from '../components/AI/AIChatInterface';
import { useAuth } from '../hooks/useAuth';
import { aiApi } from '../lib/api/aiApi';

export default function AIChatPage() {
  const router = useRouter();
  const { user, organizationId } = useAuth();
  const [sessionId, setSessionId] = useState<string | undefined>(
    router.query.session as string | undefined
  );
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Check AI service availability
  useEffect(() => {
    const checkAIAvailability = async () => {
      try {
        const isAvailable = await aiApi.isServiceAvailable();
        setIsAIAvailable(isAvailable);
      } catch (error) {
        console.error('Failed to check AI availability:', error);
        setIsAIAvailable(false);
      }
    };

    if (organizationId) {
      checkAIAvailability();
    }
  }, [organizationId]);

  // Handle new session creation
  const handleNewSession = (newSessionId: string) => {
    setSessionId(newSessionId);
    // Update URL without page reload
    router.replace(`/ai-chat?session=${newSessionId}`, undefined, { shallow: true });
  };

  // Handle AI service retry
  const handleRetryAI = () => {
    setIsAIAvailable(null);
    // Re-check availability
    const checkAIAvailability = async () => {
      try {
        const isAvailable = await aiApi.isServiceAvailable();
        setIsAIAvailable(isAvailable);
      } catch (error) {
        console.error('Failed to check AI availability:', error);
        setIsAIAvailable(false);
      }
    };
    checkAIAvailability();
  };

  // Show loading if not authenticated or no organization
  if (!user || !organizationId) {
    return (
      <DashboardLayout title="AI Assistant" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // AI availability check loading
  if (isAIAvailable === null) {
    return (
      <DashboardLayout title="AI Assistant" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking AI service availability...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // AI service unavailable
  if (isAIAvailable === false) {
    return (
      <DashboardLayout title="AI Assistant" user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">AI Service Unavailable</h3>
            <p className="mt-2 text-sm text-gray-500">
              The AI assistant is currently unavailable. Please try again later or contact support if the problem persists.
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={handleRetryAI}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Try Again
              </button>
              <button
                onClick={() => window.open('mailto:support@feedbackhub.com?subject=AI Service Issue')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Assistant" user={user}>
      <div className="h-full flex flex-col">
        {/* Page Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
              <p className="mt-1 text-sm text-gray-500">
                Ask questions about your feedback data and get AI-powered insights
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleNewSession('')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                New Conversation
              </button>
              
              <button
                onClick={() => router.push('/feedback')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                View Feedback
              </button>
            </div>
          </div>
        </div>

        {/* AI Chat Interface */}
        <div className="flex-1 min-h-0">
          <AIChatInterface
            organizationId={organizationId}
            sessionId={sessionId}
            onNewSession={handleNewSession}
            className="h-full"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}