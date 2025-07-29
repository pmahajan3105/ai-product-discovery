import React, { useState } from 'react';
import { FlexContainer } from '../Zeda';
import { Text } from '../Zeda';
import { Button } from '../Zeda';
import { Modal } from '../Zeda';
import { Colors, FontSize, FontWeight } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

export interface IntegrationHealth {
  integrationId: string;
  status: HealthStatus;
  connectionStatus: string;
  lastCheckedAt: string;
  lastSyncAt?: string;
  lastErrorAt?: string;
  metrics: {
    successCount: number;
    failureCount: number;
    totalEvents: number;
    successRate: number;
    avgResponseTime?: number;
  };
  errors: {
    recentErrors: string[];
    criticalErrorCount: number;
    lastError?: string;
  };
  details: {
    tokenExpiresAt?: string;
    configValid: boolean;
    webhookActive: boolean;
  };
}

interface IntegrationHealthStatusProps {
  health?: IntegrationHealth;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const IntegrationHealthStatus: React.FC<IntegrationHealthStatusProps> = ({
  health,
  onRefresh,
  isLoading = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!health) {
    return (
      <FlexContainer
        alignItems={FlexAlignItems.center}
        gap={6}
        padding={{ all: 8 }}
        bgColor={Colors.grey50}
        border={{ radius: 4 }}
      >
        <Text fontSize={FontSize.text_sm}>🔄</Text>
        <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
          Health check not available
        </Text>
      </FlexContainer>
    );
  }

  const getHealthIcon = () => {
    switch (health.status) {
      case HealthStatus.HEALTHY:
        return '✅';
      case HealthStatus.DEGRADED:
        return '⚠️';
      case HealthStatus.UNHEALTHY:
        return '❌';
      default:
        return '❓';
    }
  };

  const getHealthColor = () => {
    switch (health.status) {
      case HealthStatus.HEALTHY:
        return Colors.success600;
      case HealthStatus.DEGRADED:
        return Colors.warning600;
      case HealthStatus.UNHEALTHY:
        return Colors.error600;
      default:
        return Colors.grey500;
    }
  };

  const getHealthBgColor = () => {
    switch (health.status) {
      case HealthStatus.HEALTHY:
        return Colors.success25;
      case HealthStatus.DEGRADED:
        return Colors.warning25;
      case HealthStatus.UNHEALTHY:
        return Colors.error25;
      default:
        return Colors.grey25;
    }
  };

  const getConnectionStatusIcon = () => {
    switch (health.connectionStatus) {
      case 'CONNECTED':
        return '🔗';
      case 'TOKEN_EXPIRED':
        return '⏰';
      case 'RATE_LIMITED':
        return '⏱️';
      case 'DISCONNECTED':
        return '🔌';
      default:
        return '❓';
    }
  };

  const formatLastUpdate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <FlexContainer
        direction={FlexDirection.column}
        gap={8}
        padding={{ all: 12 }}
        bgColor={getHealthBgColor()}
        border={{ radius: 6, color: getHealthColor(), all: 1 }}
      >
        {/* Main Status */}
        <FlexContainer
          alignItems={FlexAlignItems.center}
          justify={FlexJustify.spaceBetween}
        >
          <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
            <Text fontSize={FontSize.text_sm}>{getHealthIcon()}</Text>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={getHealthColor()}
            >
              {health.status.charAt(0) + health.status.slice(1).toLowerCase()}
            </Text>
          </FlexContainer>

          <FlexContainer alignItems={FlexAlignItems.center} gap={4}>
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              {formatLastUpdate(health.lastCheckedAt)}
            </Text>
            {onRefresh && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onRefresh}
                disabled={isLoading}
                style={{ minWidth: 'auto', padding: '4px' }}
              >
                {isLoading ? '🔄' : '↻'}
              </Button>
            )}
          </FlexContainer>
        </FlexContainer>

        {/* Quick Metrics */}
        <FlexContainer alignItems={FlexAlignItems.center} gap={16}>
          <FlexContainer alignItems={FlexAlignItems.center} gap={4}>
            <Text fontSize={FontSize.text_xs}>{getConnectionStatusIcon()}</Text>
            <Text fontSize={FontSize.text_xs} color={Colors.grey600}>
              {health.connectionStatus.replace('_', ' ').toLowerCase()}
            </Text>
          </FlexContainer>

          {health.metrics.totalEvents > 0 && (
            <FlexContainer alignItems={FlexAlignItems.center} gap={4}>
              <Text fontSize={FontSize.text_xs}>📊</Text>
              <Text fontSize={FontSize.text_xs} color={Colors.grey600}>
                {health.metrics.successRate.toFixed(1)}% success
              </Text>
            </FlexContainer>
          )}

          {health.errors.criticalErrorCount > 0 && (
            <FlexContainer alignItems={FlexAlignItems.center} gap={4}>
              <Text fontSize={FontSize.text_xs}>⚠️</Text>
              <Text fontSize={FontSize.text_xs} color={Colors.error600}>
                {health.errors.criticalErrorCount} errors
              </Text>
            </FlexContainer>
          )}
        </FlexContainer>

        {/* Last Error */}
        {health.errors.lastError && (
          <FlexContainer
            padding={{ all: 8 }}
            bgColor={Colors.error50}
            border={{ radius: 4 }}
          >
            <Text
              fontSize={FontSize.text_xs}
              color={Colors.error700}
              style={{
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {health.errors.lastError}
            </Text>
          </FlexContainer>
        )}

        {/* View Details Button */}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setShowDetails(true)}
          style={{ alignSelf: 'flex-start' }}
        >
          View Details
        </Button>
      </FlexContainer>

      {/* Health Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Integration Health Details"
        size="lg"
      >
        <FlexContainer direction={FlexDirection.column} gap={24}>
          {/* Overview */}
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <Text fontSize={FontSize.text_lg} fontWeight={FontWeight.semiBold}>
              Health Overview
            </Text>
            
            <FlexContainer gap={16}>
              <FlexContainer
                direction={FlexDirection.column}
                padding={{ all: 16 }}
                bgColor={getHealthBgColor()}
                border={{ radius: 8 }}
                flex="1"
              >
                <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
                  <Text fontSize="20px">{getHealthIcon()}</Text>
                  <Text fontWeight={FontWeight.medium} color={getHealthColor()}>
                    {health.status}
                  </Text>
                </FlexContainer>
                <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
                  Overall Status
                </Text>
              </FlexContainer>

              <FlexContainer
                direction={FlexDirection.column}
                padding={{ all: 16 }}
                bgColor={Colors.grey50}
                border={{ radius: 8 }}
                flex="1"
              >
                <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
                  <Text fontSize="20px">{getConnectionStatusIcon()}</Text>
                  <Text fontWeight={FontWeight.medium}>
                    {health.connectionStatus.replace('_', ' ')}
                  </Text>
                </FlexContainer>
                <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
                  Connection Status
                </Text>
              </FlexContainer>
            </FlexContainer>
          </FlexContainer>

          {/* Metrics */}
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <Text fontSize={FontSize.text_lg} fontWeight={FontWeight.semiBold}>
              Performance Metrics
            </Text>
            
            <FlexContainer gap={16}>
              <FlexContainer
                direction={FlexDirection.column}
                padding={{ all: 16 }}
                bgColor={Colors.info25}
                border={{ radius: 8 }}
                flex="1"
              >
                <Text fontSize={FontSize.text_xl} fontWeight={FontWeight.bold} color={Colors.info700}>
                  {health.metrics.totalEvents}
                </Text>
                <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
                  Total Events
                </Text>
              </FlexContainer>

              <FlexContainer
                direction={FlexDirection.column}
                padding={{ all: 16 }}
                bgColor={Colors.success25}
                border={{ radius: 8 }}
                flex="1"
              >
                <Text fontSize={FontSize.text_xl} fontWeight={FontWeight.bold} color={Colors.success700}>
                  {health.metrics.successRate.toFixed(1)}%
                </Text>
                <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
                  Success Rate
                </Text>
              </FlexContainer>

              {health.metrics.avgResponseTime && (
                <FlexContainer
                  direction={FlexDirection.column}
                  padding={{ all: 16 }}
                  bgColor={Colors.purple25}
                  border={{ radius: 8 }}
                  flex="1"
                >
                  <Text fontSize={FontSize.text_xl} fontWeight={FontWeight.bold} color={Colors.purple700}>
                    {health.metrics.avgResponseTime}ms
                  </Text>
                  <Text fontSize={FontSize.text_sm} color={Colors.grey600}>
                    Avg Response Time
                  </Text>
                </FlexContainer>
              )}
            </FlexContainer>
          </FlexContainer>

          {/* Recent Errors */}
          {health.errors.recentErrors.length > 0 && (
            <FlexContainer direction={FlexDirection.column} gap={12}>
              <Text fontSize={FontSize.text_lg} fontWeight={FontWeight.semiBold}>
                Recent Errors ({health.errors.recentErrors.length})
              </Text>
              
              <FlexContainer direction={FlexDirection.column} gap={8}>
                {health.errors.recentErrors.slice(0, 5).map((error, index) => (
                  <FlexContainer
                    key={index}
                    padding={{ all: 12 }}
                    bgColor={Colors.error25}
                    border={{ radius: 6 }}
                  >
                    <Text fontSize={FontSize.text_sm} color={Colors.error700}>
                      {error}
                    </Text>
                  </FlexContainer>
                ))}
              </FlexContainer>
            </FlexContainer>
          )}

          {/* Configuration Status */}
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <Text fontSize={FontSize.text_lg} fontWeight={FontWeight.semiBold}>
              Configuration Status
            </Text>
            
            <FlexContainer direction={FlexDirection.column} gap={8}>
              <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
                <Text fontSize={FontSize.text_sm}>
                  {health.details.configValid ? '✅' : '❌'}
                </Text>
                <Text fontSize={FontSize.text_sm}>
                  Configuration Valid
                </Text>
              </FlexContainer>

              <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
                <Text fontSize={FontSize.text_sm}>
                  {health.details.webhookActive ? '✅' : '❌'}
                </Text>
                <Text fontSize={FontSize.text_sm}>
                  Webhook Active
                </Text>
              </FlexContainer>

              {health.details.tokenExpiresAt && (
                <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
                  <Text fontSize={FontSize.text_sm}>⏰</Text>
                  <Text fontSize={FontSize.text_sm}>
                    Token expires: {formatLastUpdate(health.details.tokenExpiresAt)}
                  </Text>
                </FlexContainer>
              )}
            </FlexContainer>
          </FlexContainer>

          {/* Timestamps */}
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text fontSize={FontSize.text_base} fontWeight={FontWeight.medium}>
              Activity Timeline
            </Text>
            
            <FlexContainer direction={FlexDirection.column} gap={4}>
              <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
                <Text fontSize={FontSize.text_sm} color={Colors.grey500}>
                  Last Health Check:
                </Text>
                <Text fontSize={FontSize.text_sm}>
                  {formatLastUpdate(health.lastCheckedAt)}
                </Text>
              </FlexContainer>

              {health.lastSyncAt && (
                <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
                  <Text fontSize={FontSize.text_sm} color={Colors.grey500}>
                    Last Sync:
                  </Text>
                  <Text fontSize={FontSize.text_sm}>
                    {formatLastUpdate(health.lastSyncAt)}
                  </Text>
                </FlexContainer>
              )}

              {health.lastErrorAt && (
                <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
                  <Text fontSize={FontSize.text_sm} color={Colors.grey500}>
                    Last Error:
                  </Text>
                  <Text fontSize={FontSize.text_sm} color={Colors.error600}>
                    {formatLastUpdate(health.lastErrorAt)}
                  </Text>
                </FlexContainer>
              )}
            </FlexContainer>
          </FlexContainer>
        </FlexContainer>
      </Modal>
    </>
  );
};

export default IntegrationHealthStatus;