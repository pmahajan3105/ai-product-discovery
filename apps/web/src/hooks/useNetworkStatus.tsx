/**
 * Network Status Hook and Components
 * Handles online/offline states and network-dependent UI
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import styled from '@emotion/styled';
import { cssVar, typography } from '../theme/utils';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface NetworkContextValue {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  lastOnlineTime: Date | null;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

// Network status banner
const NetworkBanner = styled.div<{ type: 'offline' | 'slow' }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${cssVar.spacing('2')};
  padding: ${cssVar.spacing('2')} ${cssVar.spacing('4')};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.type) {
      case 'offline':
        return `
          background: ${cssVar.color('status-errorBackground')};
          color: ${cssVar.color('status-error')};
          border-bottom: 1px solid ${cssVar.color('status-errorBorder')};
        `;
      case 'slow':
        return `
          background: ${cssVar.color('status-warningBackground')};
          color: ${cssVar.color('status-warning')};
          border-bottom: 1px solid ${cssVar.color('status-warningBorder')};
        `;
    }
  }}
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Network status provider
interface NetworkProviderProps {
  children: ReactNode;
  showOfflineBanner?: boolean;
  showSlowConnectionWarning?: boolean;
}

export function NetworkProvider({ 
  children, 
  showOfflineBanner = true,
  showSlowConnectionWarning = true 
}: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOnlineTime(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API (experimental)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType || null);
        setIsSlowConnection(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: NetworkContextValue = {
    isOnline,
    isSlowConnection,
    connectionType,
    lastOnlineTime,
  };

  return (
    <NetworkContext.Provider value={value}>
      {/* Offline banner */}
      {showOfflineBanner && !isOnline && (
        <NetworkBanner type="offline">
          <WifiOff />
          You're currently offline. Some features may not be available.
        </NetworkBanner>
      )}

      {/* Slow connection warning */}
      {showSlowConnectionWarning && isOnline && isSlowConnection && (
        <NetworkBanner type="slow">
          <AlertCircle />
          Slow connection detected. Some features may load slowly.
        </NetworkBanner>
      )}

      {children}
    </NetworkContext.Provider>
  );
}

// Hook to use network status
export function useNetworkStatus() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkProvider');
  }
  return context;
}

// Hook for network-dependent operations
export function useNetworkOperation() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  
  const canPerformOperation = (requiresNetwork = true) => {
    if (requiresNetwork && !isOnline) {
      return { allowed: false, reason: 'offline' };
    }
    
    if (isSlowConnection) {
      return { allowed: true, reason: 'slow' };
    }
    
    return { allowed: true, reason: null };
  };
  
  const withNetworkCheck = <T extends any[]>(
    operation: (...args: T) => Promise<any> | any,
    requiresNetwork = true
  ) => {
    return (...args: T) => {
      const { allowed, reason } = canPerformOperation(requiresNetwork);
      
      if (!allowed) {
        throw new Error(`Cannot perform operation: ${reason}`);
      }
      
      return operation(...args);
    };
  };
  
  return {
    isOnline,
    isSlowConnection,
    canPerformOperation,
    withNetworkCheck,
  };
}

// Network-aware component wrapper
interface NetworkAwareProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiresNetwork?: boolean;
  showOfflineMessage?: boolean;
}

export function NetworkAware({ 
  children, 
  fallback, 
  requiresNetwork = true,
  showOfflineMessage = true 
}: NetworkAwareProps) {
  const { isOnline } = useNetworkStatus();
  
  if (requiresNetwork && !isOnline) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showOfflineMessage) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: cssVar.spacing('8'),
          color: cssVar.color('text-secondary'),
          textAlign: 'center',
        }}>
          <WifiOff size={48} style={{ marginBottom: cssVar.spacing('4'), opacity: 0.5 }} />
          <h3 style={{ margin: 0, marginBottom: cssVar.spacing('2'), color: cssVar.color('text-primary') }}>
            You're offline
          </h3>
          <p style={{ margin: 0, maxWidth: '300px', lineHeight: 1.5 }}>
            This feature requires an internet connection. Please check your network and try again.
          </p>
        </div>
      );
    }
  }
  
  return <>{children}</>;
}

// Network status indicator component
const StatusIndicator = styled.div<{ status: 'online' | 'offline' | 'slow' }>`
  display: inline-flex;
  align-items: center;
  gap: ${cssVar.spacing('1')};
  padding: ${cssVar.spacing('1')} ${cssVar.spacing('2')};
  border-radius: ${cssVar.radius('full')};
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'online':
        return `
          background: ${cssVar.color('status-successBackground')};
          color: ${cssVar.color('status-success')};
        `;
      case 'offline':
        return `
          background: ${cssVar.color('status-errorBackground')};
          color: ${cssVar.color('status-error')};
        `;
      case 'slow':
        return `
          background: ${cssVar.color('status-warningBackground')};
          color: ${cssVar.color('status-warning')};
        `;
    }
  }}
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

interface NetworkStatusIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({ showLabel = true, className }: NetworkStatusIndicatorProps) {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
  
  const status = !isOnline ? 'offline' : isSlowConnection ? 'slow' : 'online';
  const Icon = isOnline ? Wifi : WifiOff;
  
  const getLabel = () => {
    if (!isOnline) return 'Offline';
    if (isSlowConnection) return 'Slow Connection';
    if (connectionType) return connectionType.toUpperCase();
    return 'Online';
  };
  
  return (
    <StatusIndicator status={status} className={className}>
      <Icon />
      {showLabel && getLabel()}
    </StatusIndicator>
  );
}

// Hook for retrying failed operations when back online
export function useRetryOnOnline() {
  const { isOnline } = useNetworkStatus();
  const [failedOperations, setFailedOperations] = useState<Array<{
    id: string;
    operation: () => Promise<void>;
    retryCount: number;
    maxRetries: number;
  }>>([]);

  // Retry failed operations when coming back online
  useEffect(() => {
    if (isOnline && failedOperations.length > 0) {
      const retryOperations = async () => {
        const operationsToRetry = [...failedOperations];
        setFailedOperations([]);

        for (const op of operationsToRetry) {
          if (op.retryCount < op.maxRetries) {
            try {
              await op.operation();
            } catch (error) {
              // Re-add to failed operations with incremented retry count
              setFailedOperations(prev => [...prev, {
                ...op,
                retryCount: op.retryCount + 1,
              }]);
            }
          }
        }
      };

      // Small delay to ensure connection is stable
      const timeout = setTimeout(retryOperations, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, failedOperations]);

  const addFailedOperation = (operation: () => Promise<void>, maxRetries = 3) => {
    const id = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFailedOperations(prev => [...prev, {
      id,
      operation,
      retryCount: 0,
      maxRetries,
    }]);
  };

  return { addFailedOperation, failedOperationsCount: failedOperations.length };
}

export default useNetworkStatus;