import React, { useState } from 'react';
import { FlexContainer, Container, Text, Button, Input, Select, Switch } from '../../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../../theme/layout';
import { IntegrationConfig } from '../../../types/integration';
import { integrationManager } from '../../../lib/integrations/registry';

interface ZendeskConnectionFormProps {
  integration: IntegrationConfig;
  onSuccess: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const ZendeskConnectionForm: React.FC<ZendeskConnectionFormProps> = ({
  integration,
  onSuccess,
  loading,
  setLoading
}) => {
  const [isConnected, setIsConnected] = useState(integration.status === 'connected');
  const [credentials, setCredentials] = useState({
    subdomain: integration.credentials?.subdomain || '',
    email: integration.credentials?.email || '',
    apiToken: integration.credentials?.apiToken || ''
  });
  const [settings, setSettings] = useState({
    defaultTicketType: integration.settings?.defaultTicketType || 'incident',
    defaultPriority: integration.settings?.defaultPriority || 'normal',
    autoCreateTickets: integration.settings?.autoCreateTickets ?? false,
    syncComments: integration.settings?.syncComments ?? true
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [testingConnection, setTestingConnection] = useState(false);

  const zendeskIntegration = integrationManager.getIntegration('ZENDESK' as any);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!credentials.subdomain) {
      newErrors.subdomain = 'Subdomain is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(credentials.subdomain)) {
      newErrors.subdomain = 'Invalid subdomain format';
    }

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!credentials.apiToken) {
      newErrors.apiToken = 'API token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTestingConnection(true);
    try {
      if (!zendeskIntegration) {
        throw new Error('Zendesk integration not found');
      }

      const result = await zendeskIntegration.validateCredentials(credentials);
      
      if (result.isSuccess) {
        setErrors({});
        // Show success message
      } else {
        setErrors({ general: result.error || 'Connection test failed' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConnect = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (!zendeskIntegration) {
        throw new Error('Zendesk integration not found');
      }

      const result = await zendeskIntegration.performAction('CREATE' as any, {
        credentials,
        settings,
        workspaceId: 'workspace1' // This would come from context
      });

      if (result.isSuccess) {
        setIsConnected(true);
        onSuccess(result.data);
      } else {
        setErrors({ general: result.error || 'Connection failed' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Connection failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const updatedData = {
        credentials: integration.credentials,
        settings: settings
      };
      
      setTimeout(() => {
        setLoading(false);
        onSuccess(updatedData);
      }, 1000);
    } catch (error: any) {
      setErrors({ general: error.message || 'Settings save failed' });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        setIsConnected(false);
        setLoading(false);
      }, 1000);
    } catch (error: any) {
      setErrors({ general: error.message || 'Disconnect failed' });
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <FlexContainer direction={FlexDirection.column} gap={24}>
        {/* Instructions */}
        <Container>
          <Text
            fontSize={FontSize.text_lg}
            fontWeight={FontWeight.semiBold}
            color={Colors.grey900}
            margin={{ bottom: 16 }}
          >
            Connect Your Zendesk Account
          </Text>
          
          <FlexContainer direction={FlexDirection.column} gap={12} margin={{ bottom: 16 }}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>1️⃣</Text>
              <Text color={Colors.grey700}>Go to Zendesk Admin → Channels → API</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>2️⃣</Text>
              <Text color={Colors.grey700}>Enable token access and create a new API token</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>3️⃣</Text>
              <Text color={Colors.grey700}>Copy your credentials to the form below</Text>
            </FlexContainer>
          </FlexContainer>

          <FlexContainer
            padding={{ all: 12 }}
            bgColor={Colors.warning25}
            border={{ radius: 6, color: Colors.warning200, all: 1 }}
          >
            <Text fontSize={FontSize.text_sm} color={Colors.warning700}>
              💡 Need help? <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noopener noreferrer" style={{ color: Colors.warning700, textDecoration: 'underline' }}>View Zendesk API setup guide</a>
            </Text>
          </FlexContainer>
        </Container>

        {/* Connection Form */}
        <FlexContainer direction={FlexDirection.column} gap={16}>
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Zendesk Subdomain *
            </Text>
            <Input
              value={credentials.subdomain}
              onChange={(e) => setCredentials(prev => ({ ...prev, subdomain: e.target.value }))}
              placeholder="your-company"
              suffix=".zendesk.com"
              error={errors.subdomain}
            />
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              The subdomain from your Zendesk URL (e.g., your-company.zendesk.com)
            </Text>
          </FlexContainer>

          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Admin Email *
            </Text>
            <Input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@your-company.com"
              error={errors.email}
            />
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              Email address of a Zendesk admin or agent
            </Text>
          </FlexContainer>

          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              API Token *
            </Text>
            <Input
              type="password"
              value={credentials.apiToken}
              onChange={(e) => setCredentials(prev => ({ ...prev, apiToken: e.target.value }))}
              placeholder="Enter your API token"
              error={errors.apiToken}
            />
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              Generate this in Zendesk Admin → Channels → API → Token Access
            </Text>
          </FlexContainer>

          {errors.general && (
            <FlexContainer
              padding={{ all: 12 }}
              bgColor={Colors.error25}
              border={{ radius: 6, color: Colors.error200, all: 1 }}
            >
              <Text fontSize={FontSize.text_sm} color={Colors.error700}>
                {errors.general}
              </Text>
            </FlexContainer>
          )}
        </FlexContainer>

        {/* Action Buttons */}
        <FlexContainer gap={12}>
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testingConnection || loading}
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            variant="primary"
            onClick={handleConnect}
            disabled={loading || testingConnection}
            flex="1"
          >
            {loading ? 'Connecting...' : 'Connect to Zendesk'}
          </Button>
        </FlexContainer>
      </FlexContainer>
    );
  }

  // Connected state - show settings
  return (
    <FlexContainer direction={FlexDirection.column} gap={24}>
      {/* Connection Status */}
      <FlexContainer
        padding={{ all: 16 }}
        bgColor={Colors.success25}
        border={{ radius: 8, color: Colors.success200, all: 1 }}
        alignItems={FlexAlignItems.center}
        gap={12}
      >
        <Text fontSize={FontSize.text_lg}>✅</Text>
        <FlexContainer direction={FlexDirection.column}>
          <Text
            fontSize={FontSize.text_sm}
            fontWeight={FontWeight.semiBold}
            color={Colors.success700}
          >
            Connected to {credentials.subdomain}.zendesk.com
          </Text>
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.success600}
          >
            FeedbackHub can now create and sync tickets with Zendesk
          </Text>
        </FlexContainer>
      </FlexContainer>

      {/* Settings */}
      <Container>
        <Text
          fontSize={FontSize.text_lg}
          fontWeight={FontWeight.semiBold}
          color={Colors.grey900}
          margin={{ bottom: 16 }}
        >
          Ticket Settings
        </Text>

        <FlexContainer direction={FlexDirection.column} gap={20}>
          {/* Default Settings */}
          <FlexContainer direction={FlexDirection.row} gap={16}>
            <FlexContainer direction={FlexDirection.column} gap={8} flex="1">
              <Text
                fontSize={FontSize.text_sm}
                fontWeight={FontWeight.medium}
                color={Colors.grey700}
              >
                Default Ticket Type
              </Text>
              <Select
                value={settings.defaultTicketType}
                onChange={(value) => setSettings(prev => ({ ...prev, defaultTicketType: value }))}
                options={[
                  { label: 'Incident', value: 'incident' },
                  { label: 'Problem', value: 'problem' },
                  { label: 'Question', value: 'question' },
                  { label: 'Task', value: 'task' }
                ]}
              />
            </FlexContainer>

            <FlexContainer direction={FlexDirection.column} gap={8} flex="1">
              <Text
                fontSize={FontSize.text_sm}
                fontWeight={FontWeight.medium}
                color={Colors.grey700}
              >
                Default Priority
              </Text>
              <Select
                value={settings.defaultPriority}
                onChange={(value) => setSettings(prev => ({ ...prev, defaultPriority: value }))}
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' }
                ]}
              />
            </FlexContainer>
          </FlexContainer>

          {/* Automation Settings */}
          <FlexContainer direction={FlexDirection.column} gap={16}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Automation Settings:
            </Text>

            <FlexContainer
              alignItems={FlexAlignItems.center}
              justify={FlexJustify.spaceBetween}
              padding={{ all: 12 }}
              border={{ radius: 6, color: Colors.grey200, all: 1 }}
            >
              <FlexContainer direction={FlexDirection.column}>
                <Text
                  fontSize={FontSize.text_sm}
                  fontWeight={FontWeight.medium}
                  color={Colors.grey700}
                >
                  Auto-create Tickets
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  Automatically create Zendesk tickets for new feedback
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.autoCreateTickets}
                onChange={(checked) => setSettings(prev => ({ ...prev, autoCreateTickets: checked }))}
              />
            </FlexContainer>

            <FlexContainer
              alignItems={FlexAlignItems.center}
              justify={FlexJustify.spaceBetween}
              padding={{ all: 12 }}
              border={{ radius: 6, color: Colors.grey200, all: 1 }}
            >
              <FlexContainer direction={FlexDirection.column}>
                <Text
                  fontSize={FontSize.text_sm}
                  fontWeight={FontWeight.medium}
                  color={Colors.grey700}
                >
                  Sync Comments
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  Keep comments synchronized between FeedbackHub and Zendesk
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.syncComments}
                onChange={(checked) => setSettings(prev => ({ ...prev, syncComments: checked }))}
              />
            </FlexContainer>
          </FlexContainer>
        </FlexContainer>
      </Container>

      {/* Action Buttons */}
      <FlexContainer gap={12}>
        <Button
          variant="secondary"
          colorTheme={ColorFamily.error}
          onClick={handleDisconnect}
          disabled={loading}
        >
          Disconnect
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          disabled={loading}
          flex="1"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </FlexContainer>
    </FlexContainer>
  );
};

export default ZendeskConnectionForm;