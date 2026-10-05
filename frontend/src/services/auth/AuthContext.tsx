import React, { createContext, useContext, useEffect, useState } from 'react';
import type { CurrentAccount } from '../../types/api';
import type { AuthAdapter } from './AuthAdapter';
import { MockAuthAdapter } from './MockAuthAdapter';
import { NeonAuthAdapter } from './NeonAuthAdapter';

interface AuthContextType {
  account: CurrentAccount | null;
  role: 'owner' | 'operator';
  isAuthenticated: boolean;
  isLoading: boolean;
  adapterType: 'mock' | 'neon';
  signIn: (email: string, password: string) => Promise<CurrentAccount>;
  signOut: () => Promise<void>;
  claimInvitation: (token: string) => Promise<CurrentAccount>;
  switchRole: (role: 'owner' | 'operator') => Promise<void>;
  setAdapterType: (type: 'mock' | 'neon') => void;
  getBearerToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockAdapter = new MockAuthAdapter();
const neonAdapter = new NeonAuthAdapter();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adapterType, setAdapterTypeState] = useState<'mock' | 'neon'>('mock');
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeAdapter: AuthAdapter = adapterType === 'neon' ? neonAdapter : mockAdapter;

  useEffect(() => {
    let mounted = true;
    async function loadAuth() {
      setIsLoading(true);
      try {
        await activeAdapter.init();
        const acc = await activeAdapter.getCurrentAccount();
        if (mounted) {
          setAccount(acc);
        }
      } catch (err) {
        console.error('Failed to initialize auth', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    loadAuth();
    return () => {
      mounted = false;
    };
  }, [adapterType]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const acc = await activeAdapter.signIn(email, password);
      setAccount(acc);
      return acc;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await activeAdapter.signOut();
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const claimInvitation = async (token: string) => {
    setIsLoading(true);
    try {
      const acc = await activeAdapter.claimInvitation(token);
      setAccount(acc);
      return acc;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (role: 'owner' | 'operator') => {
    if (activeAdapter.switchRole) {
      const acc = await activeAdapter.switchRole(role);
      setAccount(acc);
    }
  };

  const setAdapterType = (type: 'mock' | 'neon') => {
    setAdapterTypeState(type);
  };

  const getBearerToken = async () => {
    return activeAdapter.getToken();
  };

  const role: 'owner' | 'operator' = account?.workspace.role === 'operator' ? 'operator' : 'owner';

  return (
    <AuthContext.Provider
      value={{
        account,
        role,
        isAuthenticated: !!account,
        isLoading,
        adapterType,
        signIn,
        signOut,
        claimInvitation,
        switchRole,
        setAdapterType,
        getBearerToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
