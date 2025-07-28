/**
 * Error Handling Hook and Context
 * Centralized error handling with toast notifications and reporting
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styled from '@emotion/styled';
import { cssVar, typography } from '../theme/utils';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast notification styles
const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: ${cssVar.spacing('2')};
  max-width: 400px;
`;

const Toast = styled.div<{ type: 'error' | 'success' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: ${cssVar.spacing('3')};
  padding: ${cssVar.spacing('4')};
  border-radius: ${cssVar.radius('lg')};
  box-shadow: ${cssVar.shadow('lg')};
  border: 1px solid;
  animation: slideIn 0.3s ease-out;
  
  ${props => {
    switch (props.type) {
      case 'error':
        return `
          background: ${cssVar.color('status-errorBackground')};
          border-color: ${cssVar.color('status-errorBorder')};
          color: ${cssVar.color('status-error')};
        `;
      case 'success':
        return `
          background: ${cssVar.color('status-successBackground')};
          border-color: ${cssVar.color('status-successBorder')};
          color: ${cssVar.color('status-success')};
        `;
      case 'warning':
        return `
          background: ${cssVar.color('status-warningBackground')};
          border-color: ${cssVar.color('status-warningBorder')};
          color: ${cssVar.color('status-warning')};
        `;
      case 'info':
        return `
          background: ${cssVar.color('status-infoBackground')};
          border-color: ${cssVar.color('status-infoBorder')};
          color: ${cssVar.color('status-info')};
        `;
    }
  }}
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .toast-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .toast-content {
    flex: 1;
    min-width: 0;
  }
  
  .toast-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: ${cssVar.spacing('1')};
    color: inherit;
  }
  
  .toast-message {
    font-size: 13px;
    line-height: 1.4;
    color: ${cssVar.color('text-secondary')};
    word-wrap: break-word;
  }
  
  .toast-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    opacity: 0.7;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 1;
    }
  }
`;

// Error types
export interface AppError {
  id: string;
  type: 'network' | 'validation' | 'auth' | 'permission' | 'server' | 'unknown';
  message: string;
  details?: string;
  code?: string | number;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
  retry?: () => Promise<void>;
}

export interface Toast {
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorContextValue {
  errors: AppError[];
  toasts: Toast[];
  handleError: (error: Error | AppError, context?: Record<string, any>) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  clearError: (id: string) => void;
  clearToast: (id: string) => void;
  clearAllErrors: () => void;
  clearAllToasts: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

// Error classification helpers
function classifyError(error: Error): AppError['type'] {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'auth';
  }
  
  if (message.includes('forbidden') || message.includes('403')) {
    return 'permission';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }
  
  if (message.includes('server') || message.includes('500') || message.includes('502') || message.includes('503')) {
    return 'server';
  }
  
  return 'unknown';
}

function isRecoverableError(type: AppError['type']): boolean {
  return ['network', 'server'].includes(type);
}

function getErrorTitle(type: AppError['type']): string {
  switch (type) {
    case 'network': return 'Connection Error';
    case 'auth': return 'Authentication Error';
    case 'permission': return 'Permission Denied';
    case 'validation': return 'Invalid Input';
    case 'server': return 'Server Error';
    default: return 'Error';
  }
}

function getErrorMessage(error: Error, type: AppError['type']): string {
  switch (type) {
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'auth':
      return 'Please sign in again to continue.';
    case 'permission':
      return 'You don\'t have permission to perform this action.';
    case 'server':
      return 'The server is experiencing issues. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

// Error provider component
interface ErrorProviderProps {
  children: ReactNode;
  onError?: (error: AppError) => void;
}

export function ErrorProvider({ children, onError }: ErrorProviderProps) {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleError = useCallback((error: Error | AppError, context?: Record<string, any>) => {
    let appError: AppError;
    
    if ('type' in error) {
      // Already an AppError
      appError = error;
    } else {
      // Convert Error to AppError
      const type = classifyError(error);
      appError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message: getErrorMessage(error, type),
        details: error.message,
        timestamp: new Date(),
        context,
        recoverable: isRecoverableError(type),
      };
    }

    setErrors(prev => [...prev, appError]);

    // Show toast notification for errors
    showToast({
      type: 'error',
      title: getErrorTitle(appError.type),
      message: appError.message,
      duration: appError.recoverable ? 8000 : 5000,
      action: appError.retry ? {
        label: 'Retry',
        onClick: appError.retry
      } : undefined,
    });

    // Report to external error tracking
    if (onError) {
      onError(appError);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', appError);
    }
  }, [onError]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss toast
    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, duration);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ErrorContextValue = {
    errors,
    toasts,
    handleError,
    showToast,
    clearError,
    clearToast,
    clearAllErrors,
    clearAllToasts,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ToastRenderer toasts={toasts} onClose={clearToast} />
    </ErrorContext.Provider>
  );
}

// Toast renderer component
function ToastRenderer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'error': return AlertCircle;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
    }
  };

  return (
    <ToastContainer>
      {toasts.map(toast => {
        const Icon = getIcon(toast.type);
        return (
          <Toast key={toast.id} type={toast.type}>
            <div className="toast-icon">
              <Icon size={20} />
            </div>
            
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && (
                <div className="toast-message">{toast.message}</div>
              )}
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: '4px',
                    fontSize: '12px',
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            
            <button
              className="toast-close"
              onClick={() => onClose(toast.id)}
              aria-label="Close notification"
            >
              <X size={18} />
            </button>
          </Toast>
        );
      })}
    </ToastContainer>
  );
}

// Hook to use error handling
export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
}

// Hook for async operations with error handling
export function useAsyncOperation() {
  const { handleError, showToast } = useErrorHandler();
  
  const execute = useCallback(
    async (
      operation: () => Promise<any>,
      options?: {
        successMessage?: string;
        errorContext?: Record<string, any>;
        showSuccess?: boolean;
      }
    ): Promise<any> => {
    try {
      const result = await operation();
      
      if (options?.showSuccess && options?.successMessage) {
        showToast({
          type: 'success',
          title: 'Success',
          message: options.successMessage,
          duration: 3000,
        });
      }
      
      return result;
    } catch (error) {
      handleError(error as Error, options?.errorContext);
      return null;
    }
  }, [handleError, showToast]);
  
  return { execute };
}

// React Query error handler
export function createQueryErrorHandler() {
  return (error: Error) => {
    const { handleError } = useErrorHandler();
    handleError(error, { source: 'react-query' });
  };
}

// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandlers(handleError: ErrorContextValue['handleError']) {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleError(new Error(event.reason), { source: 'unhandled-promise' });
  });

  // Global JavaScript errors
  window.addEventListener('error', (event) => {
    handleError(event.error || new Error(event.message), {
      source: 'global-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

export default useErrorHandler;