import React, { useState } from 'react';
import { Modal, FlexContainer, Container, Text, Button } from '../Zeda';
import { Colors, FontSize, FontWeight, ColorFamily } from '../../theme/colors';
import { FlexAlignItems, FlexDirection, FlexJustify } from '../../theme/layout';
import { IntegrationConfig, IntegrationType } from '../../types/integration';
import { SlackConnectionForm } from './connections/SlackConnectionForm';
import { ZendeskConnectionForm } from './connections/ZendeskConnectionForm';
import { IntercomConnectionForm } from './connections/IntercomConnectionForm';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: IntegrationConfig;
  onConnectionSuccess: (integration: IntegrationConfig) => void;
}

enum ModalStep {
  ABOUT = 'about',
  CONNECT = 'connect',
  SETTINGS = 'settings',
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({
  isOpen,
  onClose,
  integration,
  onConnectionSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>(
    integration.status === 'connected' ? ModalStep.SETTINGS : ModalStep.ABOUT
  );
  const [loading, setLoading] = useState(false);

  const handleConnectionSuccess = (connectionData: any) => {
    const updatedIntegration: IntegrationConfig = {
      ...integration,
      status: 'connected' as any,
      isEnabled: true,
      credentials: connectionData.credentials,
      settings: connectionData.settings,
      updatedAt: new Date().toISOString()
    };
    
    onConnectionSuccess(updatedIntegration);
  };

  const renderConnectionForm = () => {
    switch (integration.type) {
      case IntegrationType.SLACK:
        return (
          <SlackConnectionForm
            integration={integration}
            onSuccess={handleConnectionSuccess}
            loading={loading}
            setLoading={setLoading}
          />
        );
      case IntegrationType.ZENDESK:
        return (
          <ZendeskConnectionForm
            integration={integration}
            onSuccess={handleConnectionSuccess}
            loading={loading}
            setLoading={setLoading}
          />
        );
      case IntegrationType.INTERCOM:
        return (
          <IntercomConnectionForm
            integration={integration}
            onSuccess={handleConnectionSuccess}
            loading={loading}
            setLoading={setLoading}
          />
        );
      default:
        return (
          <Text color={Colors.error600}>
            Connection form not implemented for {integration.type}
          </Text>
        );
    }
  };

  const renderAboutContent = () => (
    <FlexContainer direction={FlexDirection.column} gap={24}>
      {/* Header */}
      <FlexContainer alignItems={FlexAlignItems.center} gap={16}>
        <Text fontSize="48px">{integration.icon}</Text>
        <FlexContainer direction={FlexDirection.column}>
          <Text
            fontSize={FontSize.text_xl}
            fontWeight={FontWeight.bold}
            color={Colors.grey900}
          >
            {integration.name}
          </Text>
          <Text
            fontSize={FontSize.text_lg}
            color={Colors.grey600}
          >
            {integration.description}
          </Text>
        </FlexContainer>
      </FlexContainer>

      {/* Features */}
      <Container>
        <Text
          fontSize={FontSize.text_lg}
          fontWeight={FontWeight.semiBold}
          color={Colors.grey900}
          margin={{ bottom: 16 }}
        >
          What you can do:
        </Text>
        
        {integration.type === IntegrationType.SLACK && (
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>📢</Text>
              <Text color={Colors.grey700}>Get instant notifications for new feedback</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>💬</Text>
              <Text color={Colors.grey700}>Respond to feedback directly from Slack</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>🎯</Text>
              <Text color={Colors.grey700}>Configure which channels receive updates</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>📊</Text>
              <Text color={Colors.grey700}>Share feedback summaries with your team</Text>
            </FlexContainer>
          </FlexContainer>
        )}

        {integration.type === IntegrationType.ZENDESK && (
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>🎫</Text>
              <Text color={Colors.grey700}>Auto-create support tickets from feedback</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>🔄</Text>
              <Text color={Colors.grey700}>Sync ticket status with feedback status</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>👥</Text>
              <Text color={Colors.grey700}>Link customer feedback to support history</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>📋</Text>
              <Text color={Colors.grey700}>Customize ticket priority and assignment</Text>
            </FlexContainer>
          </FlexContainer>
        )}

        {integration.type === IntegrationType.INTERCOM && (
          <FlexContainer direction={FlexDirection.column} gap={12}>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>💭</Text>
              <Text color={Colors.grey700}>Create conversations from feedback</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>🏷️</Text>
              <Text color={Colors.grey700}>Auto-tag conversations with feedback context</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>👤</Text>
              <Text color={Colors.grey700}>Connect feedback to customer profiles</Text>
            </FlexContainer>
            <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
              <Text fontSize={FontSize.text_lg}>📈</Text>
              <Text color={Colors.grey700}>Track engagement and follow-ups</Text>
            </FlexContainer>
          </FlexContainer>
        )}
      </Container>

      {/* Security Note */}
      <FlexContainer
        padding={{ all: 16 }}
        bgColor={Colors.info25}
        border={{ radius: 8, color: Colors.info200, all: 1 }}
        alignItems={FlexAlignItems.center}
        gap={12}
      >
        <Text fontSize={FontSize.text_lg}>🔒</Text>
        <FlexContainer direction={FlexDirection.column}>
          <Text
            fontSize={FontSize.text_sm}
            fontWeight={FontWeight.semiBold}
            color={Colors.info700}
          >
            Secure Connection
          </Text>
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.info600}
          >
            Your credentials are encrypted and stored securely. We never access your data without permission.
          </Text>
        </FlexContainer>
      </FlexContainer>
    </FlexContainer>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop>
      <Container
        width="600px"
        maxHeight="80vh"
        overflow="auto"
        bgColor={Colors.white}
        border={{ radius: 12 }}
        padding={{ all: 0 }}
      >
        {/* Header */}
        <FlexContainer
          padding={{ all: 24 }}
          borderBottom={{ color: Colors.grey200, width: 1 }}
          alignItems={FlexAlignItems.center}
          justify={FlexJustify.spaceBetween}
        >
          <FlexContainer alignItems={FlexAlignItems.center} gap={12}>
            <Text fontSize="24px">{integration.icon}</Text>
            <Text
              fontSize={FontSize.text_lg}
              fontWeight={FontWeight.bold}
              color={Colors.grey900}
            >
              {integration.name} Integration
            </Text>
          </FlexContainer>
          
          {/* Step Tabs */}
          <FlexContainer gap={8}>
            <Button
              variant={currentStep === ModalStep.ABOUT ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCurrentStep(ModalStep.ABOUT)}
            >
              About
            </Button>
            <Button
              variant={currentStep === ModalStep.CONNECT ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCurrentStep(ModalStep.CONNECT)}
            >
              {integration.status === 'connected' ? 'Settings' : 'Connect'}
            </Button>
          </FlexContainer>
        </FlexContainer>

        {/* Content */}
        <Container padding={{ all: 24 }}>
          {currentStep === ModalStep.ABOUT && renderAboutContent()}
          {currentStep === ModalStep.CONNECT && renderConnectionForm()}
        </Container>

        {/* Footer */}
        <FlexContainer
          padding={{ all: 24 }}
          borderTop={{ color: Colors.grey200, width: 1 }}
          justify={FlexJustify.spaceBetween}
          alignItems={FlexAlignItems.center}
        >
          <Text
            fontSize={FontSize.text_sm}
            color={Colors.grey500}
          >
            Need help? Check our documentation
          </Text>
          
          <FlexContainer gap={12}>
            <Button
              variant="secondary"
              colorTheme={ColorFamily.grey}
              onClick={onClose}
              disabled={loading}
            >
              Close
            </Button>
            {currentStep === ModalStep.ABOUT && integration.status !== 'connected' && (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(ModalStep.CONNECT)}
              >
                Get Started
              </Button>
            )}
          </FlexContainer>
        </FlexContainer>
      </Container>
    </Modal>
  );
};

export default IntegrationModal;