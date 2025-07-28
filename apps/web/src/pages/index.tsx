import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { Colors } from '../theme/colors';
import { Button } from '../components/Button/Button';
import { useAuth } from '../hooks/useAuth';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${Colors.blue50} 0%, ${Colors.white} 100%);
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 16px 24px;
  background: ${Colors.white};
  border-bottom: 1px solid ${Colors.grey200};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${Colors.blue600};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`;

const Hero = styled.div`
  text-align: center;
  max-width: 600px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: ${Colors.grey900};
  margin: 0 0 16px 0;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${Colors.grey600};
  margin: 0 0 32px 0;
  line-height: 1.6;
`;

const CTASection = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${Colors.blue600};
  color: ${Colors.white};
  border: none;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  
  &:hover {
    background: ${Colors.blue700};
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${Colors.grey700};
  border: 1px solid ${Colors.grey300};
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  
  &:hover {
    background: ${Colors.grey50};
    border-color: ${Colors.grey400};
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Features = styled.div`
  margin-top: 64px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  max-width: 900px;
`;

const FeatureCard = styled.div`
  background: ${Colors.white};
  padding: 24px;
  border-radius: 12px;
  border: 1px solid ${Colors.grey200};
  text-align: left;
`;

const FeatureTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 8px 0;
`;

const FeatureDescription = styled.p`
  font-size: 14px;
  color: ${Colors.grey600};
  margin: 0;
  line-height: 1.5;
`;

const Footer = styled.footer`
  padding: 24px;
  text-align: center;
  color: ${Colors.grey500};
  font-size: 14px;
  border-top: 1px solid ${Colors.grey200};
  background: ${Colors.white};
`;

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSignIn = () => {
    router.push('/auth');
  };

  const handleGetStarted = () => {
    router.push('/auth');
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Container>
        <Header>
          <Logo>FeedbackHub</Logo>
        </Header>
        <Main>
          <div style={{ textAlign: 'center', color: Colors.grey600 }}>
            Loading...
          </div>
        </Main>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Logo>FeedbackHub</Logo>
        <HeaderActions>
          <SecondaryButton onClick={handleSignIn}>
            Sign In
          </SecondaryButton>
        </HeaderActions>
      </Header>

      <Main>
        <Hero>
          <Title>Centralize Your Customer Feedback</Title>
          <Subtitle>
            Collect, organize, and act on feedback from all your channels in one place. 
            Connect Slack, Zendesk, Intercom, and more to never miss valuable insights.
          </Subtitle>
          
          <CTASection>
            <PrimaryButton onClick={handleGetStarted}>
              Get Started Free
            </PrimaryButton>
            <SecondaryButton onClick={() => router.push('/demo')}>
              View Demo
            </SecondaryButton>
          </CTASection>

          <Features>
            <FeatureCard>
              <FeatureTitle>🔗 Smart Integrations</FeatureTitle>
              <FeatureDescription>
                Connect with Slack, Zendesk, Intercom, and email to automatically capture feedback from all your channels.
              </FeatureDescription>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureTitle>🤖 AI-Powered Insights</FeatureTitle>
              <FeatureDescription>
                Use natural language to search and analyze feedback patterns. Ask questions like "What are customers saying about performance?"
              </FeatureDescription>
            </FeatureCard>
            
            <FeatureCard>
              <FeatureTitle>👥 Customer Profiles</FeatureTitle>
              <FeatureDescription>
                Automatically identify and track customers across channels. See their complete feedback history in one place.
              </FeatureDescription>
            </FeatureCard>
          </Features>
        </Hero>
      </Main>

      <Footer>
        © 2024 FeedbackHub. Built for teams who care about customer feedback.
      </Footer>
    </Container>
  );
}