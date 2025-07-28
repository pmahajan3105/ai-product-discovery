import type { AppProps } from 'next/app';
import React, { useEffect, useState } from "react";
import SuperTokensReact, { SuperTokensWrapper } from "supertokens-auth-react";
import { SuperTokensConfig } from "../config/supertokens";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ErrorProvider, setupGlobalErrorHandlers } from '../hooks/useErrorHandler';
import { NetworkProvider } from '../hooks/useNetworkStatus';
import { ErrorBoundary } from '../components/Error/ErrorBoundary';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  // we only want to call this init function on the frontend, so we check typeof window !== 'undefined'
  SuperTokensReact.init(SuperTokensConfig);
}

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error: any) => {
          // Don't retry on auth errors
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
      },
      mutations: {
        retry: false, // Don't retry mutations by default
      },
    },
  }));
  
  // Set up global error handlers
  useEffect(() => {
    const handleError = (error: Error, context?: Record<string, any>) => {
      console.error('Global error:', error, context);
    };
    
    setupGlobalErrorHandlers(handleError);
  }, []);

  useEffect(() => {
    async function doRefresh() {
      // pageProps.fromSupertokens === 'needs-refresh' will be true
      // when in getServerSideProps, getSession throws a TRY_REFRESH_TOKEN error.
      if (pageProps.fromSupertokens === 'needs-refresh') {
        if (await SuperTokensReact.attemptRefreshingSession()) {
          // successful refresh, redirect back to the same page
          location.reload();
        } else {
          // unsuccessful refresh, redirect to login page
          SuperTokensReact.redirectToAuth();
        }
      }
    }
    doRefresh();
  }, [pageProps.fromSupertokens]);

  if (pageProps.fromSupertokens === 'needs-refresh') {
    // show nothing or a loading screen while the refresh happens
    return <div>Loading...</div>;
  }

  return (
    <ErrorBoundary level="page" onError={(error, errorInfo) => {
      console.error('App-level error:', error, errorInfo);
      // TODO: Send to error tracking service
    }}>
      <ErrorProvider>
        <NetworkProvider>
          <QueryClientProvider client={queryClient}>
            <SuperTokensWrapper>
              <ThemeProvider>
                <Component {...pageProps} />
                <ReactQueryDevtools initialIsOpen={false} />
              </ThemeProvider>
            </SuperTokensWrapper>
          </QueryClientProvider>
        </NetworkProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}