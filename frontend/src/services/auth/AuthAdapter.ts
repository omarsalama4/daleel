import type { CurrentAccount } from '../../types/api';

export interface AuthSession {
  token: string | null;
  account: CurrentAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthAdapter {
  init(): Promise<void>;
  getToken(): Promise<string | null>;
  getCurrentAccount(): Promise<CurrentAccount | null>;
  signIn(email: string, password: string): Promise<CurrentAccount>;
  signOut(): Promise<void>;
  claimInvitation(token: string): Promise<CurrentAccount>;
  switchRole(role: 'owner' | 'operator'): Promise<CurrentAccount>;
}
