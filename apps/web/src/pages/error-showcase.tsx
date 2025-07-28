/**
 * Error & Empty State Showcase
 * Demonstrates comprehensive error handling and empty state patterns
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { ErrorBoundary } from '../components/Error/ErrorBoundary';
import { 
  EmptyState,
  NoFeedbackEmpty,
  NoSearchResultsEmpty,
  NoFilterResultsEmpty,
  LoadingFailedEmpty,
  SuccessEmpty,
  ComingSoonEmpty,
  UnauthorizedEmpty,
  OfflineEmpty
} from '../components/Empty/EmptyStates';
import { useErrorHandler, useAsyncOperation } from '../hooks/useErrorHandler';
import { useNetworkStatus, NetworkStatusIndicator, NetworkAware } from '../hooks/useNetworkStatus';
import { cssVar, typography, component } from '../theme/utils';
import { 
  Bug, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

const ShowcaseContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: ${cssVar.spacing('12')};
`;

const SectionTitle = styled.h2`
  ${typography.styles.heading}
  margin-bottom: ${cssVar.spacing('6')};
  padding-bottom: ${cssVar.spacing('4')};
  border-bottom: 1px solid ${cssVar.color('border-primary')};
`;

const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 'auto-fit'}, minmax(300px, 1fr));
  gap: ${cssVar.spacing('6')};
  margin-bottom: ${cssVar.spacing('6')};
`;

const Card = styled.div`
  background: ${cssVar.color('surface-primary')};
  border: 1px solid ${cssVar.color('border-primary')};
  border-radius: ${cssVar.radius('xl')};
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: ${cssVar.spacing('4')} ${cssVar.spacing('6')};
  border-bottom: 1px solid ${cssVar.color('border-primary')};
  background: ${cssVar.color('surface-secondary')};
  
  h3 {
    margin: 0 0 ${cssVar.spacing('2')} 0;
    font-size: 16px;
    font-weight: 600;
    color: ${cssVar.color('text-primary')};
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: ${cssVar.color('text-secondary')};
    line-height: 1.5;
  }
`;

const CardContent = styled.div`
  padding: ${cssVar.spacing('6')};
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DemoActions = styled.div`
  display: flex;
  gap: ${cssVar.spacing('3')};
  margin-bottom: ${cssVar.spacing('6')};
  flex-wrap: wrap;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  ${component.button.base}
  padding: ${cssVar.spacing('3')} ${cssVar.spacing('4')};
  border-radius: ${cssVar.radius('md')};
  font-size: 14px;
  
  ${props => {
    switch (props.variant) {
      case 'primary': return component.button.primary;
      case 'danger': return `
        background: ${cssVar.color('status-error')};
        color: white;
        border-color: ${cssVar.color('status-error')};
        
        &:hover:not(:disabled) {
          background: ${cssVar.color('status-errorBorder')};
          border-color: ${cssVar.color('status-errorBorder')};
        }
      `;
      default: return component.button.secondary;
    }
  }}
`;

const NetworkStatus = styled.div`
  display: flex;
  align-items: center;
  gap: ${cssVar.spacing('4')};
  padding: ${cssVar.spacing('4')};
  background: ${cssVar.color('surface-secondary')};
  border-radius: ${cssVar.radius('lg')};
  margin-bottom: ${cssVar.spacing('6')};
`;

// Component that throws errors for testing
function ErrorThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error thrown by the component');
  }
  
  return (
    <div style={{ textAlign: 'center', padding: cssVar.spacing('8') }}>
      <CheckCircle size={48} style={{ color: cssVar.color('status-success'), marginBottom: cssVar.spacing('4') }} />
      <h3 style={{ margin: 0, color: cssVar.color('text-primary') }}>
        Component is working fine!
      </h3>
      <p style={{ margin: '8px 0 0', color: cssVar.color('text-secondary') }}>
        No errors detected in this component.
      </p>
    </div>
  );
}

export default function ErrorShowcase() {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [asyncOperationState, setAsyncOperationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const { handleError, showToast } = useErrorHandler();
  const { execute } = useAsyncOperation();
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();

  const mockUser = {
    name: 'Error Showcase',
    email: 'errors@feedbackhub.dev'
  };

  // Demo functions
  const triggerNetworkError = () => {
    const error = new Error('Failed to fetch data from server');
    handleError(error, { source: 'api', endpoint: '/api/feedback' });
  };

  const triggerAuthError = () => {
    const error = new Error('Unauthorized access - please sign in again');
    handleError(error, { source: 'auth', action: 'token-validation' });
  };

  const triggerValidationError = () => {
    const error = new Error('Invalid email format provided');
    handleError(error, { source: 'form', field: 'email' });
  };

  const triggerAsyncOperation = async () => {
    setAsyncOperationState('loading');
    
    const result = await execute(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Randomly succeed or fail
        if (Math.random() > 0.5) {
          throw new Error('Simulated API failure');
        }
        
        return { success: true };
      },
      {
        successMessage: 'Operation completed successfully!',
        showSuccess: true,
        errorContext: { operation: 'demo-async-operation' }
      }
    );
    
    setAsyncOperationState(result ? 'success' : 'error');
    
    // Reset after 3 seconds
    setTimeout(() => setAsyncOperationState('idle'), 3000);
  };

  const showSuccessToast = () => {
    showToast({
      type: 'success',
      title: 'Success!',
      message: 'Your action was completed successfully.',
      duration: 4000,
    });
  };

  const showWarningToast = () => {
    showToast({
      type: 'warning',
      title: 'Warning',
      message: 'This action may have unexpected consequences.',
      duration: 6000,
    });
  };

  const showInfoToast = () => {
    showToast({
      type: 'info',
      title: 'Information',
      message: 'Here\'s some useful information about this feature.',
      action: {
        label: 'Learn More',
        onClick: () => console.log('Learn more clicked')
      }
    });
  };

  return (
    <DashboardLayout title="Error & Empty State Showcase" user={mockUser}>
      <ShowcaseContainer>
        {/* Network Status */}
        <Section>
          <SectionTitle>
            <Wifi style={{ marginRight: '8px', display: 'inline' }} />
            Network Status
          </SectionTitle>
          
          <NetworkStatus>
            <NetworkStatusIndicator />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: cssVar.color('text-primary') }}>
                Connection Status: {isOnline ? 'Online' : 'Offline'}
              </div>
              <div style={{ fontSize: '12px', color: cssVar.color('text-secondary') }}>
                Type: {connectionType || 'Unknown'} 
                {isSlowConnection && ' (Slow)'}
              </div>
            </div>
          </NetworkStatus>
        </Section>

        {/* Error Boundaries */}
        <Section>
          <SectionTitle>
            <Bug style={{ marginRight: '8px', display: 'inline' }} />
            Error Boundaries
          </SectionTitle>
          
          <DemoActions>
            <Button
              variant={shouldThrowError ? 'primary' : 'danger'}
              onClick={() => setShouldThrowError(!shouldThrowError)}
            >
              {shouldThrowError ? 'Fix Component' : 'Break Component'}
            </Button>
          </DemoActions>

          <Grid columns={1}>
            <Card>
              <CardHeader>
                <h3>Component Error Boundary</h3>
                <p>Catches errors thrown by child components and shows a fallback UI</p>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  <ErrorThrowingComponent shouldThrow={shouldThrowError} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        {/* Toast Notifications */}
        <Section>
          <SectionTitle>
            <Zap style={{ marginRight: '8px', display: 'inline' }} />
            Toast Notifications & Error Handling
          </SectionTitle>
          
          <DemoActions>
            <Button onClick={triggerNetworkError}>Network Error</Button>
            <Button onClick={triggerAuthError}>Auth Error</Button>
            <Button onClick={triggerValidationError}>Validation Error</Button>
            <Button onClick={showSuccessToast} variant="primary">Success Toast</Button>
            <Button onClick={showWarningToast}>Warning Toast</Button>
            <Button onClick={showInfoToast}>Info Toast</Button>
          </DemoActions>

          <Grid columns={1}>
            <Card>
              <CardHeader>
                <h3>Async Operation with Error Handling</h3>
                <p>Demonstrates error handling for async operations with loading states</p>
              </CardHeader>
              <CardContent>
                <div style={{ textAlign: 'center' }}>
                  <Button 
                    onClick={triggerAsyncOperation}
                    disabled={asyncOperationState === 'loading'}
                    variant="primary"
                  >
                    {asyncOperationState === 'loading' && <RefreshCw size={16} className="animate-spin" />}
                    {asyncOperationState === 'loading' ? 'Processing...' : 'Run Async Operation'}
                  </Button>
                  
                  {asyncOperationState === 'success' && (
                    <p style={{ marginTop: cssVar.spacing('4'), color: cssVar.color('status-success') }}>
                      ✅ Operation completed successfully!
                    </p>
                  )}
                  
                  {asyncOperationState === 'error' && (
                    <p style={{ marginTop: cssVar.spacing('4'), color: cssVar.color('status-error') }}>
                      ❌ Operation failed - check the error toast
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        {/* Empty States */}
        <Section>
          <SectionTitle>
            <AlertTriangle style={{ marginRight: '8px', display: 'inline' }} />
            Empty States
          </SectionTitle>
          
          <Grid>
            <Card>
              <CardHeader>
                <h3>No Feedback</h3>
                <p>First-time user experience with helpful guidance</p>
              </CardHeader>
              <CardContent>
                <NoFeedbackEmpty 
                  onCreateFeedback={() => showToast({ type: 'info', title: 'Create Feedback', message: 'Create feedback clicked!' })}
                  onImportData={() => showToast({ type: 'info', title: 'Import Data', message: 'Import data clicked!' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>No Search Results</h3>
                <p>When search queries return no matches</p>
              </CardHeader>
              <CardContent>
                <NoSearchResultsEmpty 
                  searchQuery="nonexistent feedback"
                  onClearSearch={() => showToast({ type: 'info', title: 'Search Cleared', message: 'Search has been cleared!' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>No Filter Results</h3>
                <p>When applied filters return no results</p>
              </CardHeader>
              <CardContent>
                <NoFilterResultsEmpty 
                  onClearFilters={() => showToast({ type: 'info', title: 'Filters Cleared', message: 'All filters have been cleared!' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Loading Failed</h3>
                <p>When data fails to load with retry option</p>
              </CardHeader>
              <CardContent>
                <LoadingFailedEmpty 
                  onRetry={() => showToast({ type: 'info', title: 'Retrying', message: 'Attempting to reload data...' })}
                  onReportIssue={() => showToast({ type: 'info', title: 'Issue Reported', message: 'Thank you for reporting this issue!' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Success State</h3>
                <p>Confirmation of successful actions</p>
              </CardHeader>
              <CardContent>
                <SuccessEmpty 
                  title="Data imported successfully!"
                  description="Your feedback data has been imported and is now available in your dashboard."
                  onContinue={() => showToast({ type: 'info', title: 'Continue', message: 'Continuing to dashboard...' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Coming Soon</h3>
                <p>Features in development</p>
              </CardHeader>
              <CardContent>
                <ComingSoonEmpty 
                  feature="Advanced Analytics"
                  onNotifyMe={() => showToast({ type: 'success', title: 'Subscribed', message: 'You\'ll be notified when this feature is ready!' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Unauthorized</h3>
                <p>Access restriction messaging</p>
              </CardHeader>
              <CardContent>
                <UnauthorizedEmpty 
                  onSignIn={() => showToast({ type: 'info', title: 'Sign In', message: 'Redirecting to sign in...' })}
                  onGoHome={() => showToast({ type: 'info', title: 'Go Home', message: 'Redirecting to dashboard...' })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Network Aware Component</h3>
                <p>Shows offline message when network is unavailable</p>
              </CardHeader>
              <CardContent>
                <NetworkAware>
                  <div style={{ textAlign: 'center', padding: cssVar.spacing('4') }}>
                    <CheckCircle size={48} style={{ color: cssVar.color('status-success'), marginBottom: cssVar.spacing('4') }} />
                    <h3 style={{ margin: 0, color: cssVar.color('text-primary') }}>
                      You're online!
                    </h3>
                    <p style={{ margin: '8px 0 0', color: cssVar.color('text-secondary') }}>
                      This component is available when connected to the internet.
                    </p>
                  </div>
                </NetworkAware>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        {/* Usage Guidelines */}
        <Section>
          <SectionTitle>Usage Guidelines</SectionTitle>
          
          <Grid>
            <Card>
              <CardHeader>
                <h3>✅ Error Handling Best Practices</h3>
              </CardHeader>
              <CardContent>
                <ul style={{ color: cssVar.color('text-secondary'), fontSize: '14px', lineHeight: 1.6 }}>
                  <li>Use error boundaries at page, section, and component levels</li>
                  <li>Provide clear, actionable error messages</li>
                  <li>Include retry mechanisms for recoverable errors</li>
                  <li>Log errors with sufficient context for debugging</li>
                  <li>Show appropriate fallback UI for different error types</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <h3>✅ Empty State Best Practices</h3>
              </CardHeader>
              <CardContent>
                <ul style={{ color: cssVar.color('text-secondary'), fontSize: '14px', lineHeight: 1.6 }}>
                  <li>Provide clear illustrations and messaging</li>
                  <li>Include primary actions to help users progress</li>
                  <li>Offer helpful tips and guidance</li>
                  <li>Match empty states to specific user scenarios</li>
                  <li>Keep messaging positive and solution-oriented</li>
                </ul>
              </CardContent>
            </Card>
          </Grid>
        </Section>
      </ShowcaseContainer>
    </DashboardLayout>
  );
}