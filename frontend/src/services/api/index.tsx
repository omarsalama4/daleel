import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ApiClient } from './ApiClient';
import { HttpApiClient } from './HttpApiClient';
import { MockApiClient } from './MockApiClient';
import { useAuth } from '../auth/AuthContext';

interface ApiContextType {
  api: ApiClient;
  mode: 'mock' | 'http';
  setMode: (mode: 'mock' | 'http') => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Persist singleton mock instance across component renders so user actions (creating runs, saving workflows, etc.) stay in state
const mockClientInstance = new MockApiClient();

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const demo = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true';
  const [mode, setModeState] = useState<'mock' | 'http'>(demo ? 'mock' : 'http');
  const setMode = (value: 'mock' | 'http') => { if (demo) setModeState(value); };
  const { getBearerToken } = useAuth();

  const httpClient = useMemo(() => {
    return new HttpApiClient(getBearerToken, import.meta.env.VITE_API_BASE_URL || '/api/v1');
  }, [getBearerToken]);

  const api: ApiClient = mode === 'http' ? httpClient : mockClientInstance;

  return (
    <ApiContext.Provider value={{ api, mode, setMode }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiClient => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context.api;
};

export const useApiClient = useApi;

export const useApiConfig = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiProvider');
  }
  return { mode: context.mode, setMode: context.setMode };
};
