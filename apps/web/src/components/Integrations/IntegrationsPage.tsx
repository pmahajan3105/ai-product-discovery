import React, { useState, useEffect } from 'react';
import { FlexContainer, Container, Text } from '../Zeda';
import { FlexAlignItems, FlexDirection } from '../../theme/layout';
import { IntegrationConfig, IntegrationType, IntegrationStatus } from '../../types/integration';
import { IntegrationCard } from './IntegrationCard';
import { IntegrationModal } from './IntegrationModal';
import { integrationManager } from '../../lib/integrations/registry';
import { integrationsApi, OAuthConnection, IntegrationType as ApiIntegrationType } from '../../lib/api/integrationsApi';
import { AlertCircle } from 'lucide-react';

interface IntegrationsPageProps {
  organizationId: string;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ organizationId }) => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [availableTypes, setAvailableTypes] = useState<ApiIntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Initialize integrations on component mount
    console.log('Available integrations:', integrationManager.getSupportedIntegrations());
    loadIntegrations();
  }, [organizationId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load available integration types
      const typesResponse = await integrationsApi.getAvailableIntegrationTypes();
      if (typesResponse.success && typesResponse.data) {
        setAvailableTypes(typesResponse.data);
      }
      
      // Load existing OAuth connections
      const connectionsResponse = await integrationsApi.getOAuthConnections(organizationId);
      if (connectionsResponse.success && connectionsResponse.data) {
        // Convert OAuth connections to IntegrationConfig format
        const connectedIntegrations = connectionsResponse.data.map((connection: OAuthConnection) => ({
          id: connection.id,
          name: getIntegrationDisplayName(connection.integrationType),
          type: mapIntegrationType(connection.integrationType),
          description: getIntegrationDescription(connection.integrationType),
          icon: getIntegrationIcon(connection.integrationType),
          authType: 'oauth2' as any,
          status: connection.isActive ? IntegrationStatus.CONNECTED : IntegrationStatus.DISCONNECTED,
          isEnabled: connection.isActive,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          connectionName: connection.connectionName,
          healthStatus: connection.healthStatus
        }));
        
        // Merge with available types to show disconnected integrations
        const allIntegrations = typesResponse.data?.map((type: ApiIntegrationType) => {
          const existingConnection = connectedIntegrations.find(
            (conn: IntegrationConfig) => conn.type === mapIntegrationType(type.type)
          );
          
          if (existingConnection) {
            return existingConnection;
          }
          
          // Create placeholder for disconnected integration
          return {
            id: `${type.type}-placeholder`,
            name: type.name,
            type: mapIntegrationType(type.type),
            description: type.description,
            icon: type.icon,
            authType: type.authType as any,
            status: IntegrationStatus.DISCONNECTED,
            isEnabled: false,
            createdAt: '',
            updatedAt: ''
          };
        }) || [];
        
        setIntegrations(allIntegrations);
      }
    } catch (err) {
      console.error('Error loading integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper functions
  const getIntegrationDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      'SLACK': 'Slack',
      'ZENDESK': 'Zendesk',
      'INTERCOM': 'Intercom'
    };
    return names[type] || type;
  };
  
  const mapIntegrationType = (apiType: string): IntegrationType => {
    const typeMap: Record<string, IntegrationType> = {
      'SLACK': IntegrationType.SLACK,
      'ZENDESK': IntegrationType.ZENDESK,
      'INTERCOM': IntegrationType.INTERCOM
    };
    return typeMap[apiType] || IntegrationType.SLACK;
  };
  
  const getIntegrationDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      'SLACK': 'Get feedback notifications in your Slack channels and respond directly from Slack',
      'ZENDESK': 'Automatically create support tickets from feedback and sync status updates',
      'INTERCOM': 'Sync feedback to Intercom conversations and track customer interactions'
    };
    return descriptions[type] || 'Integration description';
  };
  
  const getIntegrationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'SLACK': '💬',
      'ZENDESK': '🎫',
      'INTERCOM': '💭'
    };
    return icons[type] || '🔗';
  };

  const handleConnect = async (integration: IntegrationConfig) => {
    try {
      // If it's a real connection, open modal for configuration
      if (!integration.id.includes('placeholder')) {
        setSelectedIntegration(integration);
        setModalOpen(true);
        return;
      }
      
      // For placeholder integrations, start OAuth flow
      const integrationTypeKey = Object.keys(availableTypes).find(
        type => mapIntegrationType(type) === integration.type
      );
      
      if (integrationTypeKey) {
        const response = await integrationsApi.getOAuthAuthorizationUrl(
          organizationId,
          integrationTypeKey
        );
        
        if (response.success && response.data) {
          // Redirect to OAuth authorization URL
          window.location.href = response.data.authorizationUrl;
        } else {
          throw new Error(response.error || 'Failed to start authorization');
        }
      }
    } catch (err) {
      console.error('Error connecting integration:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect integration');
    }
  };

  const handleDisconnect = async (integration: IntegrationConfig) => {
    try {
      if (!integration.id.includes('placeholder')) {
        await integrationsApi.deleteOAuthConnection(organizationId, integration.id);
        await loadIntegrations(); // Reload to refresh state
      }
    } catch (err) {
      console.error('Error disconnecting integration:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect integration');
    }
  };

  const handleToggleEnabled = async (integration: IntegrationConfig) => {
    try {
      if (!integration.id.includes('placeholder')) {
        await integrationsApi.updateOAuthConnection(organizationId, integration.id, {
          isActive: !integration.isEnabled
        });
        await loadIntegrations(); // Reload to refresh state
      }
    } catch (err) {
      console.error('Error toggling integration:', err);
      setError(err instanceof Error ? err.message : 'Failed to update integration');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedIntegration(null);
  };

  const handleConnectionSuccess = (updatedIntegration: IntegrationConfig) => {
    handleModalClose();
    // Reload integrations to get the latest state
    loadIntegrations();
  };

  const connectedCount = integrations.filter(int => int.status === IntegrationStatus.CONNECTED).length;

  // Show loading state
  if (loading) {
    return (
      <Container padding={{ all: 24 }}>        <FlexContainer
          direction={FlexDirection.column}
          alignItems={FlexAlignItems.center}
          gap={16}
          style={{ minHeight: '400px', justifyContent: 'center' }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <Text fontSize="text_lg" color="grey600">Loading integrations...</Text>
        </FlexContainer>
      </Container>
    );
  }

  return (
    <Container padding={{ all: 24 }}>
      {/* Error State */}
      {error && (
        <FlexContainer
          padding={{ all: 16 }}
          margin={{ bottom: 24 }}
          bgColor="red50"
          border={{ radius: 8, color: "red200", all: 1 }}
          alignItems={FlexAlignItems.center}
          gap={12}
        >
          <AlertCircle size={20} color="#DC2626" />
          <FlexContainer direction={FlexDirection.column} flex="1">
            <Text fontSize="text_sm" fontWeight="medium" color="red800">
              Error loading integrations
            </Text>
            <Text fontSize="text_xs" color="red600">
              {error}
            </Text>
          </FlexContainer>
          <button
            onClick={() => loadIntegrations()}
            className="text-sm text-red-800 underline hover:text-red-900"
          >
            Try again
          </button>
        </FlexContainer>
      )}
      {/* Header */}
      <FlexContainer
        direction={FlexDirection.column}
        margin={{ bottom: 32 }}
      >
        <Text
          fontSize="text_2xl"
          fontWeight="bold"
          color="grey900"
          margin={{ bottom: 8 }}
        >
          Integrations
        </Text>
        <Text
          fontSize="text_lg"
          color="grey600"
          margin={{ bottom: 16 }}
        >
          Connect FeedbackHub with your favorite tools to streamline your workflow
        </Text>
        
        {/* Stats */}
        <FlexContainer
          padding={{ all: 16 }}
          bgColor="primary25"
          border={{ radius: 8, color: "primary200", all: 1 }}
          alignItems={FlexAlignItems.center}
          gap={16}
        >
          <FlexContainer alignItems={FlexAlignItems.center} gap={8}>
            <Text fontSize="text_2xl">🔗</Text>
            <FlexContainer direction={FlexDirection.column}>
              <Text
                fontSize="text_lg"
                fontWeight="bold"
                color="primary700"
              >
                {connectedCount} of {integrations.length}
              </Text>
              <Text
                fontSize="text_sm"
                color="primary600"
              >
                integrations connected
              </Text>
            </FlexContainer>
          </FlexContainer>
          
          {connectedCount === 0 && (
            <Text
              fontSize="text_sm"
              color="primary600"
              flex="1"
            >
              Connect your first integration to start automating your feedback workflow
            </Text>
          )}
        </FlexContainer>
      </FlexContainer>

      {/* Integrations Grid */}
      <FlexContainer
        direction={FlexDirection.row}
        gap={24}
        style={{ flexWrap: 'wrap' }}
      >
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={() => handleConnect(integration)}
            onDisconnect={() => handleDisconnect(integration)}
            onToggleEnabled={() => handleToggleEnabled(integration)}
          />
        ))}
      </FlexContainer>

      {/* Available Soon Section */}
      <FlexContainer
        direction={FlexDirection.column}
        margin={{ top: 48 }}
      >
        <Text
          fontSize="text_lg"
          fontWeight="semiBold"
          color="grey900"
          margin={{ bottom: 16 }}
        >
          Coming Soon
        </Text>
        
        <FlexContainer
          direction={FlexDirection.row}
          gap={16}
          style={{ flexWrap: 'wrap' }}
        >
          {[
            { name: 'Jira', icon: '🔷', description: 'Create issues from feedback' },
            { name: 'Linear', icon: '📐', description: 'Sync feedback to Linear issues' },
            { name: 'Notion', icon: '📝', description: 'Save feedback to Notion databases' },
            { name: 'Discord', icon: '🎮', description: 'Get notifications in Discord' }
          ].map((comingSoon) => (
            <FlexContainer
              key={comingSoon.name}
              direction={FlexDirection.column}
              padding={{ all: 20 }}
              border={{ radius: 8, color: "grey200", all: 1 }}
              bgColor="grey50"
              width="280px"
              alignItems={FlexAlignItems.center}
              gap={12}
            >
              <Text fontSize="text_2xl">{comingSoon.icon}</Text>
              <Text
                fontSize="text_lg"
                fontWeight="semiBold"
                color="grey700"
              >
                {comingSoon.name}
              </Text>
              <Text
                fontSize="text_sm"
                color="grey500"
                textAlign="center"
              >
                {comingSoon.description}
              </Text>
              <Text
                fontSize="text_xs"
                color="primary600"
                fontWeight="medium"
              >
                Coming Soon
              </Text>
            </FlexContainer>
          ))}
        </FlexContainer>
      </FlexContainer>

      {/* Integration Modal */}
      {selectedIntegration && (
        <IntegrationModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          integration={selectedIntegration}
          onConnectionSuccess={handleConnectionSuccess}
        />
      )}
    </Container>
  );
};

export default IntegrationsPage;