import React, { useState } from 'react';
import { FlexContainer, Container, Text, Button, Select, Switch } from '../../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../../theme/layout';
import { IntegrationConfig } from '../../../types/integration';
import { integrationManager } from '../../../lib/integrations/registry';

interface SlackConnectionFormProps {
  integration: IntegrationConfig;
  onSuccess: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const SlackConnectionForm: React.FC<SlackConnectionFormProps> = ({
  integration,
  onSuccess,
  loading,
  setLoading
}) => {
  const [isConnected, setIsConnected] = useState(integration.status === 'connected');
  const [channels, setChannels] = useState([
    { id: 'C1234567890', name: 'general', isPrivate: false },
    { id: 'C0987654321', name: 'feedback', isPrivate: false },
    { id: 'C5555555555', name: 'product-team', isPrivate: true }
  ]);
  const [settings, setSettings] = useState({
    defaultChannel: integration.settings?.defaultChannel || '',
    notifyOnNewFeedback: integration.settings?.notifyOnNewFeedback ?? true,
    notifyOnStatusChange: integration.settings?.notifyOnStatusChange ?? false,
    includeCustomerInfo: integration.settings?.includeCustomerInfo ?? true
  });

  const slackIntegration = integrationManager.getIntegration('SLACK' as any);

  const handleConnectWithSlack = async () => {
    if (!slackIntegration) {
      console.error('Slack integration not found');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would redirect to Slack OAuth
      const redirectUri = `${window.location.origin}/integrations/slack/callback`;
      const oauthUrl = (slackIntegration as any).getOAuthUrl(redirectUri);
      
      // For demo purposes, simulate successful connection
      setTimeout(() => {
        const mockConnectionData = {
          credentials: {
            accessToken: 'xoxb-mock-token',
            teamId: 'T1234567890',
            teamName: 'Your Team',
            userId: 'U1234567890'
          },
          settings: settings
        };
        
        setIsConnected(true);
        setLoading(false);
        onSuccess(mockConnectionData);
      }, 2000);
      
      // In real implementation, open OAuth popup or redirect
      // window.open(oauthUrl, 'slack-oauth', 'width=600,height=600');
    } catch (error) {
      console.error('Slack connection error:', error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API to update settings
      setTimeout(() => {
        const updatedData = {
          credentials: integration.credentials,
          settings: settings
        };
        setLoading(false);
        onSuccess(updatedData);
      }, 1000);
    } catch (error) {
      console.error('Settings save error:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API to disconnect
      setTimeout(() => {
        setIsConnected(false);
        setLoading(false);
        // Reset to disconnected state
      }, 1000);
    } catch (error) {
      console.error('Disconnect error:', error);
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <FlexContainer direction={FlexDirection.column} gap={24}>
        {/* Connection Instructions */}
        <Container>
          <Text
            fontSize="text_lg"
            fontWeight="semiBold"
            color="grey900"
            margin={{ bottom: 16 }}
          >
            Connect Your Slack Workspace
          </Text>
          
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize="text_lg">1️⃣</Text>
              <Text color="grey700">Click "Connect with Slack" below</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize="text_lg">2️⃣</Text>
              <Text color="grey700">Authorize FeedbackHub to access your Slack workspace</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize="text_lg">3️⃣</Text>
              <Text color="grey700">Configure notification preferences</Text>
            </FlexContainer>
          </FlexContainer>
        </Container>

        {/* Permissions Info */}
        <FlexContainer
          padding={{ all: 16 }}
          bgColor="info25"
          border={{ radius: 8, color: "info200", all: 1 }}
        >
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize="text_sm"
              fontWeight="semiBold"
              color="info700"
            >
              Permissions Required:
            </Text>
            <FlexContainer direction={FlexDirection.column} gap={4}>
              <Text fontSize="text_sm" color="info600">
                • Read channel list (to show available channels)
              </Text>
              <Text fontSize="text_sm" color="info600">
                • Send messages (to post feedback notifications)
              </Text>
              <Text fontSize="text_sm" color="info600">
                • Read team info (to identify your workspace)
              </Text>
            </FlexContainer>
          </FlexContainer>
        </FlexContainer>

        {/* Connect Button */}
        <FlexContainer justify={FlexJustify.center}>
          <Button
            variant="primary"
            onClick={handleConnectWithSlack}
            disabled={loading}
            size="lg"
            style={{
              backgroundColor: '#4A154B',
              borderColor: '#4A154B',
              color: 'white',
              padding: '12px 24px',
              fontSize: '16px'
            }}
          >
            {loading ? (
              <>⏳ Connecting...</>
            ) : (
              <>💬 Connect with Slack</>
            )}
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
            Connected to Your Team
          </Text>
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.success600}
          >
            FeedbackHub can now send notifications to your Slack channels
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
          Notification Settings
        </Text>

        <FlexContainer direction={FlexDirection.column} gap={20}>
          {/* Default Channel */}
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Default Channel
            </Text>
            <Select
              value={settings.defaultChannel}
              onChange={(value) => setSettings(prev => ({ ...prev, defaultChannel: value }))}
              placeholder="Select a channel for notifications"
              options={[
                { label: 'Select a channel...', value: '' },
                ...channels.map(channel => ({
                  label: `# ${channel.name}${channel.isPrivate ? ' (private)' : ''}`,
                  value: channel.id
                }))
              ]}
            />
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              This channel will receive all feedback notifications by default
            </Text>
          </FlexContainer>

          {/* Notification Preferences */}
          <FlexContainer direction={FlexDirection.column} gap={16}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              What to notify about:
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
                  New Feedback
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  When new feedback is submitted
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.notifyOnNewFeedback}
                onChange={(checked) => setSettings(prev => ({ ...prev, notifyOnNewFeedback: checked }))}
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
                  Status Changes
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  When feedback status is updated
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.notifyOnStatusChange}
                onChange={(checked) => setSettings(prev => ({ ...prev, notifyOnStatusChange: checked }))}
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
                  Include Customer Info
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  Include customer details in notifications
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.includeCustomerInfo}
                onChange={(checked) => setSettings(prev => ({ ...prev, includeCustomerInfo: checked }))}
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

export default SlackConnectionForm;