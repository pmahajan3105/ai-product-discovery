import React, { useState } from 'react';
import { FlexContainer, Container, Text, Button, Input, Select, Switch } from '../../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../../theme/layout';
import { IntegrationConfig } from '../../../types/integration';
import { integrationManager } from '../../../lib/integrations/registry';

interface IntercomConnectionFormProps {
  integration: IntegrationConfig;
  onSuccess: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const IntercomConnectionForm: React.FC<IntercomConnectionFormProps> = ({
  integration,
  onSuccess,
  loading,
  setLoading
}) => {
  const [isConnected, setIsConnected] = useState(integration.status === 'connected');
  const [teams, setTeams] = useState([
    { id: 'team1', name: 'Support Team' },
    { id: 'team2', name: 'Product Team' },
    { id: 'team3', name: 'Success Team' }
  ]);
  const [settings, setSettings] = useState({
    defaultTags: integration.settings?.defaultTags || ['feedback-hub'],
    syncToConversations: integration.settings?.syncToConversations ?? true,
    assignToTeam: integration.settings?.assignToTeam || ''
  });
  const [tagInput, setTagInput] = useState('');

  const intercomIntegration = integrationManager.getIntegration('INTERCOM' as any);

  const handleConnectWithIntercom = async () => {
    if (!intercomIntegration) {
      console.error('Intercom integration not found');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would redirect to Intercom OAuth
      const redirectUri = `${window.location.origin}/integrations/intercom/callback`;
      const oauthUrl = (intercomIntegration as any).getOAuthUrl(redirectUri);
      
      // For demo purposes, simulate successful connection
      setTimeout(() => {
        const mockConnectionData = {
          credentials: {
            accessToken: 'intercom-mock-token',
            appId: 'app123456',
            region: 'us'
          },
          settings: settings
        };
        
        setIsConnected(true);
        setLoading(false);
        onSuccess(mockConnectionData);
      }, 2000);
      
      // In real implementation, open OAuth popup or redirect
      // window.open(oauthUrl, 'intercom-oauth', 'width=600,height=600');
    } catch (error) {
      console.error('Intercom connection error:', error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
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
      setTimeout(() => {
        setIsConnected(false);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Disconnect error:', error);
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !settings.defaultTags.includes(tagInput.trim())) {
      setSettings(prev => ({
        ...prev,
        defaultTags: [...prev.defaultTags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      defaultTags: prev.defaultTags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isConnected) {
    return (
      <FlexContainer direction={FlexDirection.column} gap={24}>
        {/* Connection Instructions */}
        <Container>
          <Text
            fontSize={FontSize.text_lg}
            fontWeight={FontWeight.semiBold}
            color={Colors.grey900}
            margin={{ bottom: 16 }}
          >
            Connect Your Intercom Workspace
          </Text>
          
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>1️⃣</Text>
              <Text color={Colors.grey700}>Click "Connect with Intercom" below</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>2️⃣</Text>
              <Text color={Colors.grey700}>Authorize FeedbackHub to access your Intercom workspace</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>3️⃣</Text>
              <Text color={Colors.grey700}>Configure conversation and tagging preferences</Text>
            </FlexContainer>
          </FlexContainer>
        </Container>

        {/* Permissions Info */}
        <FlexContainer
          padding={{ all: 16 }}
          bgColor={Colors.info25}
          border={{ radius: 8, color: Colors.info200, all: 1 }}
        >
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.semiBold}
              color={Colors.info700}
            >
              Permissions Required:
            </Text>
            <FlexContainer direction={FlexDirection.column} gap={4}>
              <Text fontSize={FontSize.text_sm} color={Colors.info600}>
                • Read and write conversations (to sync feedback)
              </Text>
              <Text fontSize={FontSize.text_sm} color={Colors.info600}>
                • Read and write contacts (to link customer data)
              </Text>
              <Text fontSize={FontSize.text_sm} color={Colors.info600}>
                • Read workspace data (to identify teams and settings)
              </Text>
            </FlexContainer>
          </FlexContainer>
        </FlexContainer>

        {/* Connect Button */}
        <FlexContainer justify={FlexJustify.center}>
          <Button
            variant="primary"
            onClick={handleConnectWithIntercom}
            disabled={loading}
            size="lg"
            style={{
              backgroundColor: '#0049C7',
              borderColor: '#0049C7',
              color: 'white',
              padding: '12px 24px',
              fontSize: '16px'
            }}
          >
            {loading ? (
              <>⏳ Connecting...</>
            ) : (
              <>💭 Connect with Intercom</>
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
            Connected to Intercom
          </Text>
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.success600}
          >
            FeedbackHub can now create conversations and sync customer data
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
          Conversation Settings
        </Text>

        <FlexContainer direction={FlexDirection.column} gap={20}>
          {/* Team Assignment */}
          <FlexContainer direction={FlexDirection.column} gap={8}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Assign to Team (Optional)
            </Text>
            <Select
              value={settings.assignToTeam}
              onChange={(value) => setSettings(prev => ({ ...prev, assignToTeam: value }))}
              placeholder="Select a team for auto-assignment"
              options={[
                { label: 'No automatic assignment', value: '' },
                ...teams.map(team => ({
                  label: team.name,
                  value: team.id
                }))
              ]}
            />
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              New conversations from feedback will be assigned to this team
            </Text>
          </FlexContainer>

          {/* Default Tags */}
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Default Tags
            </Text>
            
            {/* Tag Input */}
            <FlexContainer gap={8}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                flex="1"
              />
              <Button
                variant="secondary"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </FlexContainer>

            {/* Tag List */}
            <FlexContainer style={{ flexWrap: 'wrap' }} gap={8}>
              {settings.defaultTags.map((tag, index) => (
                <FlexContainer
                  key={index}
                  alignItems={FlexAlignItems.center}
                  gap={8}
                  padding={{ left: 12, right: 8, top: 6, bottom: 6 }}
                  bgColor={Colors.primary100}
                  border={{ radius: 16 }}
                >
                  <Text
                    fontSize={FontSize.text_sm}
                    color={Colors.primary700}
                    fontWeight={FontWeight.medium}
                  >
                    {tag}
                  </Text>
                  <Text
                    fontSize={FontSize.text_sm}
                    color={Colors.primary600}
                    cursor="pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </Text>
                </FlexContainer>
              ))}
            </FlexContainer>
            
            <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
              These tags will be automatically applied to conversations created from feedback
            </Text>
          </FlexContainer>

          {/* Sync Settings */}
          <FlexContainer direction={FlexDirection.column} gap={16}>
            <Text
              fontSize={FontSize.text_sm}
              fontWeight={FontWeight.medium}
              color={Colors.grey700}
            >
              Sync Settings:
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
                  Sync to Conversations
                </Text>
                <Text fontSize={FontSize.text_xs} color={Colors.grey500}>
                  Create Intercom conversations for new feedback
                </Text>
              </FlexContainer>
              <Switch
                checked={settings.syncToConversations}
                onChange={(checked) => setSettings(prev => ({ ...prev, syncToConversations: checked }))}
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

export default IntercomConnectionForm;