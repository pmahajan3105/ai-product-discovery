/**
 * Advanced Loading State Components
 * Production-ready loading states with proper user feedback
 */

import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

// Spinner variants
const SpinnerBase = styled.div<{ size: number; color: string }>`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border: 2px solid ${Colors.grey200};
  border-top: 2px solid ${props => props.color};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = Colors.primary500,
  className 
}) => {
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  return <SpinnerBase size={sizeMap[size]} color={color} className={className} />;
};

// Inline loading states
const InlineLoadingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${Colors.info50};
  border: 1px solid ${Colors.info200};
  border-radius: 6px;
  font-size: 14px;
  color: ${Colors.info700};
`;

interface InlineLoadingProps {
  message?: string;
  showSpinner?: boolean;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  message = "Loading...", 
  showSpinner = true 
}) => (
  <InlineLoadingContainer>
    {showSpinner && <Loader2 size={16} className="animate-spin" />}
    {message}
  </InlineLoadingContainer>
);

// Button loading states
const LoadingButton = styled.button<{ variant: 'primary' | 'secondary' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: not-allowed;
  opacity: 0.7;
  transition: all 0.2s;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${Colors.primary500};
          color: ${Colors.white};
          border: 1px solid ${Colors.primary500};
        `;
      case 'secondary':
        return `
          background: ${Colors.white};
          color: ${Colors.grey600};
          border: 1px solid ${Colors.grey300};
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${Colors.grey600};
          border: 1px solid transparent;
        `;
    }
  }}
`;

interface ButtonLoadingProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  disabled?: boolean;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ 
  variant = 'primary', 
  children,
  disabled = true
}) => (
  <LoadingButton variant={variant} disabled={disabled}>
    <Loader2 size={16} className="animate-spin" />
    {children}
  </LoadingButton>
);

// Full page loading
const FullPageContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const LoadingContent = styled.div`
  text-align: center;
  max-width: 300px;
`;

const LoadingTitle = styled.h3`
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const LoadingMessage = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${Colors.grey600};
  line-height: 1.5;
`;

interface FullPageLoadingProps {
  title?: string;
  message?: string;
  onCancel?: () => void;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({ 
  title = "Loading...",
  message = "Please wait while we load your data.",
  onCancel
}) => (
  <FullPageContainer>
    <LoadingContent>
      <LoadingSpinner size="lg" />
      <LoadingTitle>{title}</LoadingTitle>
      <LoadingMessage>{message}</LoadingMessage>
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${Colors.grey300}`,
            borderRadius: '6px',
            color: Colors.grey600,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      )}
    </LoadingContent>
  </FullPageContainer>
);

// Error state with retry
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  background: ${Colors.white};
  border: 1px solid ${Colors.error200};
  border-radius: 8px;
`;

const ErrorIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${Colors.error100};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  
  svg {
    color: ${Colors.error600};
  }
`;

const ErrorTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const ErrorMessage = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${Colors.grey600};
  line-height: 1.5;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${Colors.primary500};
  color: ${Colors.white};
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${Colors.primary600};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLoading?: boolean;
  showRetry?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "We encountered an error while loading your data. Please try again.",
  onRetry,
  retryLoading = false,
  showRetry = true
}) => (
  <ErrorContainer>
    <ErrorIcon>
      <AlertCircle size={24} />
    </ErrorIcon>
    <ErrorTitle>{title}</ErrorTitle>
    <ErrorMessage>{message}</ErrorMessage>
    {showRetry && onRetry && (
      <RetryButton onClick={onRetry} disabled={retryLoading}>
        {retryLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            Try Again
          </>
        )}
      </RetryButton>
    )}
  </ErrorContainer>
);

// Progressive loading indicator
const ProgressContainer = styled.div`
  width: 100%;
  max-width: 400px;
  margin: 20px auto;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${Colors.grey200};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, ${Colors.primary500}, ${Colors.primary600});
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: ${Colors.grey600};
`;

interface ProgressLoadingProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
  progress,
  message = "Loading...",
  showPercentage = true
}) => (
  <ProgressContainer>
    <ProgressBar>
      <ProgressFill progress={Math.min(100, Math.max(0, progress))} />
    </ProgressBar>
    <ProgressText>
      <span>{message}</span>
      {showPercentage && <span>{Math.round(progress)}%</span>}
    </ProgressText>
  </ProgressContainer>
);

// Card loading overlay
const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
`;

interface CardLoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const CardLoadingOverlay: React.FC<CardLoadingOverlayProps> = ({
  isLoading,
  children,
  message = "Loading..."
}) => (
  <div style={{ position: 'relative' }}>
    {children}
    {isLoading && (
      <CardOverlay>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="md" />
          <div style={{ marginTop: '8px', fontSize: '14px', color: Colors.grey600 }}>
            {message}
          </div>
        </div>
      </CardOverlay>
    )}
  </div>
);