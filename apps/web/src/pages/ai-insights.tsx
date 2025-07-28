/**
 * AI Insights Page
 * Main page for AI-powered feedback analysis and chat
 */

import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { AIChatInterface } from '../components/AI/AIChatInterface';
import { LoadingStates } from '../components/Loading/LoadingStates';
import { EmptyStates } from '../components/Empty/EmptyStates';
import { useOrganization } from '../hooks/useOrganization';
import { aiApi } from '../lib/api/aiApi';
import SuperTokens, { redirectToAuth } from 'supertokens-auth-react';
import { sessionAuth } from '../config/supertokens';

interface AIInsightsPageProps {
  sessionId?: string;
}

export default function AIInsightsPage({ sessionId }: AIInsightsPageProps) {
  const router = useRouter();
  const { currentOrganization, isLoading: orgLoading, error: orgError } = useOrganization();
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);

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

    if (currentOrganization) {
      checkAIAvailability();
    }
  }, [currentOrganization]);

  // Handle session creation
  const handleNewSession = (newSessionId: string) => {
    setCurrentSessionId(newSessionId);
    // Update URL without page reload
    router.replace(`/ai-insights?session=${newSessionId}`, undefined, { shallow: true });
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

  // Loading states
  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <LoadingStates.pageLoading message="Loading AI Insights..." />
        </div>
      </DashboardLayout>
    );
  }

  // Error states
  if (orgError || !currentOrganization) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <EmptyStates.loadingFailed 
            onRetry={() => window.location.reload()}
          />
        </div>
      </DashboardLayout>
    );
  }

  // AI availability check
  if (isAIAvailable === null) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <LoadingStates.componentLoading message="Checking AI service availability..." />
        </div>
      </DashboardLayout>
    );
  }

  if (isAIAvailable === false) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <EmptyStates.aiServiceUnavailable 
            onRetry={handleRetryAI}
            onContactSupport={() => {
              // Open support email or chat
              window.open('mailto:support@feedbackhub.com?subject=AI Service Issue');
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>AI Insights - FeedbackHub</title>
        <meta name="description" content="AI-powered feedback analysis and insights" />
      </Head>

      <DashboardLayout>
        <div className="h-full">
          {/* Page Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Insights
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Ask questions about your feedback data and get AI-powered insights
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleNewSession('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  New Conversation
                </button>
                
                <button
                  onClick={() => {
                    window.open('/insights', '_blank');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  View Insights Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* AI Chat Interface */}
          <div className="h-[calc(100vh-8rem)]">
            <AIChatInterface
              organizationId={currentOrganization.id}
              sessionId={currentSessionId}
              onNewSession={handleNewSession}
              className="h-full"
            />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

// Server-side authentication and session handling
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const session = await sessionAuth(context.req, context.res);
    
    if (!session) {
      return redirectToAuth();
    }

    // Extract session ID from query if provided
    const sessionId = context.query.session as string | undefined;

    return {
      props: {
        sessionId: sessionId || null
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return redirectToAuth();
  }
};