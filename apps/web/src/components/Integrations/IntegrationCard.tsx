import React, { useState, useEffect } from 'react';
import { FlexContainer } from '../Zeda';
import { Text } from '../Zeda';
import { Button } from '../Zeda';
import { Switch } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';
import { IntegrationConfig, IntegrationStatus } from '../../types/integration';
import { IntegrationHealthStatus, IntegrationHealth } from './IntegrationHealthStatus';
import { integrationHealthAPI } from '../../services/integrationHealthApi';

interface IntegrationCardProps {
  integration: IntegrationConfig;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleEnabled: () => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConnect,
  onDisconnect,
  onToggleEnabled
}) => {
  const [health, setHealth] = useState<IntegrationHealth | undefined>();
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  
  const isConnected = integration.status === IntegrationStatus.CONNECTED;
  const isConnecting = integration.status === IntegrationStatus.CONNECTING;
  const hasError = integration.status === IntegrationStatus.ERROR;

  // Load health data for connected integrations
  useEffect(() => {
    if (isConnected && integration.id) {
      loadHealthData();
    }
  }, [isConnected, integration.id]);

  const loadHealthData = async () => {
    if (!integration.id) return;
    
    try {
      setIsLoadingHealth(true);
      const healthData = await integrationHealthAPI.getIntegrationHealth(integration.id);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load integration health:', error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const handleRefreshHealth = async () => {
    if (!integration.id) return;
    
    try {
      setIsLoadingHealth(true);
      const healthData = await integrationHealthAPI.refreshIntegrationHealth(integration.id);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to refresh integration health:', error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const getStatusColor = () => {
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return Colors.success600;
      case IntegrationStatus.ERROR:
        return Colors.error600;
      case IntegrationStatus.CONNECTING:
        return Colors.warning600;
      default:
        return Colors.grey500;
    }
  };

  const getStatusText = () => {
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return integration.isEnabled ? 'Connected & Active' : 'Connected & Paused';
      case IntegrationStatus.ERROR:
        return 'Connection Error';
      case IntegrationStatus.CONNECTING:
        return 'Connecting...';
      default:
        return 'Not Connected';
    }
  };

  const getStatusIcon = () => {
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return integration.isEnabled ? '✅' : '⏸️';
      case IntegrationStatus.ERROR:
        return '❌';
      case IntegrationStatus.CONNECTING:
        return '⏳';
      default:
        return '🔌';
    }
  };

  return (
    <FlexContainer
      direction={FlexDirection.column}
      padding={{ all: 24 }}
      border={{ 
        radius: 12, 
        color: isConnected ? Colors.success200 : Colors.grey200, 
        all: 1 
      }}
      bgColor={isConnected ? Colors.success25 : Colors.white}
      width="320px"
      minHeight="200px"
      gap={16}
      style={{
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <FlexContainer
        alignItems={FlexAlignItems.center}
        justify={FlexJustify.spaceBetween}
      >
        <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
          <Text fontSize="32px">{integration.icon}</Text>
          <FlexContainer direction={FlexDirection.column}>
            <Text
              fontSize={FontSize.text_lg}
              fontWeight={FontWeight.semiBold}
              color={Colors.grey900}
            >
              {integration.name}
            </Text>
            <FlexContainer alignItems={FlexAlignItems.center} gap={6}>
              <Text fontSize={FontSize.text_sm}>{getStatusIcon()}</Text>
              <Text
                fontSize={FontSize.text_sm}
                color={getStatusColor()}
                fontWeight={FontWeight.medium}
              >
                {getStatusText()}
              </Text>
            </FlexContainer>
          </FlexContainer>
        </FlexContainer>

        {/* Health Indicator */}
        <FlexContainer
          width={12}
          height={12}
          border={{ radius: 6 }}
          bgColor={getStatusColor()}
        />
      </FlexContainer>

      {/* Description */}
      <Text
        fontSize={FontSize.text_sm}
        color={Colors.grey600}
        lineHeight="1.5"
        flex="1"
      >
        {integration.description}
      </Text>

      {/* Actions */}
      <FlexContainer
        direction={FlexDirection.column}
        gap={12}
      >
        {isConnected && (
          <FlexContainer
            alignItems={FlexAlignItems.center}
            justify={FlexJustify.spaceBetween}
            padding={{ all: 12 }}
            bgColor={Colors.grey50}
            border={{ radius: 6 }}
          >
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              {integration.isEnabled ? 'Active' : 'Paused'}
            </Text>
            <Switch
              checked={integration.isEnabled}
              onChange={onToggleEnabled}
              size="sm"
            />
          </FlexContainer>
        )}

        <FlexContainer gap={8}>
          {!isConnected ? (
            <Button
              variant="primary"
              onClick={onConnect}
              disabled={isConnecting}
              width="100%"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                colorTheme={ColorFamily.grey}
                onClick={onConnect}
                width="50%"
              >
                Settings
              </Button>
              <Button
                variant="secondary"
                colorTheme={ColorFamily.error}
                onClick={onDisconnect}
                width="50%"
              >
                Disconnect
              </Button>
            </>
          )}
        </FlexContainer>

        {hasError && integration.healthCheck?.errorMessage && (
          <FlexContainer
            padding={{ all: 8 }}
            bgColor={Colors.error25}
            border={{ radius: 4, color: Colors.error200, all: 1 }}
          >
            <Text
              fontSize={FontSize.text_xs}
              color={Colors.error700}
            >
              Error: {integration.healthCheck.errorMessage}
            </Text>
          </FlexContainer>
        )}

        {/* Health Status - show for connected integrations */}
        {isConnected && (
          <IntegrationHealthStatus
            health={health}
            onRefresh={handleRefreshHealth}
            isLoading={isLoadingHealth}
          />
        )}
      </FlexContainer>

      {/* Last Updated */}
      {integration.updatedAt && (
        <Text
          fontSize={FontSize.text_xs}
          color={Colors.grey400}
          textAlign="center"
        >
          Last updated: {new Date(integration.updatedAt).toLocaleDateString()}
        </Text>
      )}
    </FlexContainer>
  );
};

export default IntegrationCard;