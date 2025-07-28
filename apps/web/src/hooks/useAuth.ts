import { useState, useEffect } from 'react';
import AuthService, { AuthUser } from '../services/authService';

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: any }>;
  signInWithGoogle: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth session:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await checkAuth();
  };

  const signInWithEmail = async (email: string) => {
    return await AuthService.signInWithEmail({ email });
  };

  const signInWithGoogle = async () => {
    await AuthService.signInWithGoogle();
  };

  return {
    user,
    loading,
    isAuthenticated,
    logout,
    refresh,
    signInWithEmail,
    signInWithGoogle
  };
}