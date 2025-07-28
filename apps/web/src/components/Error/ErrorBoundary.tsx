/**
 * Error Boundary Components
 * Comprehensive error handling with fallback UI and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from '@emotion/styled';
import { cssVar, typography, component } from '../../theme/utils';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Copy,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${cssVar.spacing('8')};
  text-align: center;
  background: ${cssVar.color('surface-primary')};
  border-radius: ${cssVar.radius('xl')};
  border: 1px solid ${cssVar.color('border-primary')};
`;

const ErrorIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${cssVar.color('status-errorBackground')};
  border-radius: ${cssVar.radius('full')};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${cssVar.spacing('6')};
  
  svg {
    width: 32px;
    height: 32px;
    color: ${cssVar.color('status-error')};
  }
`;

const ErrorTitle = styled.h2`
  ${typography.styles.heading}
  margin-bottom: ${cssVar.spacing('4')};
  color: ${cssVar.color('text-primary')};
`;

const ErrorMessage = styled.p`
  ${typography.styles.body}
  color: ${cssVar.color('text-secondary')};
  max-width: 500px;
  margin-bottom: ${cssVar.spacing('6')};
  line-height: 1.6;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: ${cssVar.spacing('3')};
  margin-bottom: ${cssVar.spacing('6')};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
  ${component.button.base}
  padding: ${cssVar.spacing('3')} ${cssVar.spacing('4')};
  border-radius: ${cssVar.radius('md')};
  font-size: 14px;
  
  ${props => {
    switch (props.variant) {
      case 'primary': return component.button.primary;
      case 'secondary': return component.button.secondary;
      case 'ghost': return `
        background: ${cssVar.color('interactive-ghost')};
        color: ${cssVar.color('text-primary')};
        
        &:hover:not(:disabled) {
          background: ${cssVar.color('interactive-ghostHover')};
        }
      `;
      default: return component.button.primary;
    }
  }}
`;

const ErrorDetails = styled.div`
  width: 100%;
  max-width: 600px;
  margin-top: ${cssVar.spacing('4')};
`;

const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${cssVar.spacing('2')};
  margin: 0 auto ${cssVar.spacing('4')};
  padding: ${cssVar.spacing('2')} ${cssVar.spacing('3')};
  background: transparent;
  border: 1px solid ${cssVar.color('border-primary')};
  border-radius: ${cssVar.radius('md')};
  color: ${cssVar.color('text-secondary')};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${cssVar.color('surface-secondary')};
    border-color: ${cssVar.color('border-secondary')};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const DetailsContent = styled.div`
  background: ${cssVar.color('surface-secondary')};
  border: 1px solid ${cssVar.color('border-primary')};
  border-radius: ${cssVar.radius('lg')};
  padding: ${cssVar.spacing('4')};
  text-align: left;
`;

const ErrorStack = styled.pre`
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: ${cssVar.color('text-secondary')};
  background: ${cssVar.color('surface-tertiary')};
  padding: ${cssVar.spacing('3')};
  border-radius: ${cssVar.radius('base')};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: ${cssVar.spacing('3')};
  max-height: 200px;
  overflow-y: auto;
`;

const ErrorMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${cssVar.spacing('3')};
  margin-bottom: ${cssVar.spacing('3')};
  
  div {
    background: ${cssVar.color('surface-primary')};
    padding: ${cssVar.spacing('2')} ${cssVar.spacing('3')};
    border-radius: ${cssVar.radius('base')};
    border: 1px solid ${cssVar.color('border-primary')};
  }
  
  dt {
    font-size: 12px;
    font-weight: 500;
    color: ${cssVar.color('text-tertiary')};
    margin-bottom: ${cssVar.spacing('1')};
  }
  
  dd {
    font-size: 14px;
    color: ${cssVar.color('text-primary')};
    margin: 0;
    word-break: break-word;
  }
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${cssVar.spacing('2')};
  padding: ${cssVar.spacing('2')} ${cssVar.spacing('3')};
  background: ${cssVar.color('interactive-secondary')};
  border: 1px solid ${cssVar.color('border-primary')};
  border-radius: ${cssVar.radius('md')};
  color: ${cssVar.color('text-primary')};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${cssVar.color('interactive-secondaryHover')};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate errors to this boundary
  level?: 'page' | 'section' | 'component'; // Error boundary level
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.generateErrorId(),
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  reportError(error: Error, errorInfo: ErrorInfo) {
    // In a real app, send to error monitoring service like Sentry
    const errorReport = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      level: this.props.level || 'component',
    };

    console.error('Error Report:', errorReport);
    
    // TODO: Send to error tracking service
    // errorTracker.captureException(error, { extra: errorReport });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: this.generateErrorId(),
    }));
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  handleCopyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error || !errorInfo) return;

    const errorDetails = `
Error ID: ${errorId}
Message: ${error.message}
Stack: ${error.stack}
Component Stack: ${errorInfo.componentStack}
Timestamp: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}
    `.trim();

    navigator.clipboard.writeText(errorDetails);
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, errorId, retryCount } = this.state;
      const { level = 'component' } = this.props;

      const titles = {
        page: 'Page Error',
        section: 'Section Error', 
        component: 'Something went wrong'
      };

      const messages = {
        page: 'This page encountered an error and cannot be displayed. Please try refreshing the page or return to the dashboard.',
        section: 'This section encountered an error. You can try refreshing or continue using other parts of the application.',
        component: 'A component on this page encountered an error. This may be a temporary issue.'
      };

      return (
        <ErrorContainer>
          <ErrorIcon>
            <AlertTriangle />
          </ErrorIcon>
          
          <ErrorTitle>{titles[level]}</ErrorTitle>
          
          <ErrorMessage>
            {messages[level]}
            {retryCount > 0 && (
              <span style={{ display: 'block', marginTop: '8px', fontSize: '14px' }}>
                Retry attempt: {retryCount}
              </span>
            )}
          </ErrorMessage>

          <ErrorActions>
            <Button variant="primary" onClick={this.handleRetry}>
              <RefreshCw size={16} />
              Try Again
            </Button>
            
            {level === 'page' && (
              <Button variant="secondary" onClick={this.handleGoHome}>
                <Home size={16} />
                Go to Dashboard
              </Button>
            )}
          </ErrorActions>

          <ErrorDetails>
            <DetailsToggle onClick={() => this.setState({ showDetails: !showDetails })}>
              <Bug size={16} />
              {showDetails ? 'Hide' : 'Show'} Error Details
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </DetailsToggle>

            {showDetails && error && errorInfo && (
              <DetailsContent>
                <ErrorMeta>
                  <div>
                    <dt>Error ID</dt>
                    <dd>{errorId}</dd>
                  </div>
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{new Date().toLocaleString()}</dd>
                  </div>
                </ErrorMeta>

                <div style={{ marginBottom: '16px' }}>
                  <dt style={{ fontSize: '12px', fontWeight: '500', color: cssVar.color('text-tertiary'), marginBottom: '8px' }}>
                    Error Message
                  </dt>
                  <ErrorStack>{error.message}</ErrorStack>
                </div>

                {error.stack && (
                  <div style={{ marginBottom: '16px' }}>
                    <dt style={{ fontSize: '12px', fontWeight: '500', color: cssVar.color('text-tertiary'), marginBottom: '8px' }}>
                      Stack Trace
                    </dt>
                    <ErrorStack>{error.stack}</ErrorStack>
                  </div>
                )}

                <CopyButton onClick={this.handleCopyErrorDetails}>
                  <Copy size={14} />
                  Copy Error Details
                </CopyButton>
              </DetailsContent>
            )}
          </ErrorDetails>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for throwing errors in functional components (for testing)
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;