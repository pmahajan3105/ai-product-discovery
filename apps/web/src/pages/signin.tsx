import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from '@emotion/styled';
import { Mail, Chrome, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button/Button';
import { Colors } from '../theme/colors';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 40px;
  width: 100%;
  max-width: 400px;
`;

export default function SignIn() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <Container>
        <AuthCard>
          <div style={{ textAlign: 'center' }}>
            <Loader size={20} />
            Checking authentication...
          </div>
        </AuthCard>
      </Container>
    );
  }

  return (
    <Container>
      <AuthCard>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0' }}>
            Welcome to FeedbackHub
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: Colors.grey600 }}>
            Sign in to manage your feedback
          </p>
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center', padding: '20px', background: '#FEF3C7', borderRadius: '8px' }}>
          🚧 Authentication system is being configured. Please check back soon!
        </div>
      </AuthCard>
    </Container>
  );
}