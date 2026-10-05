import type { AuthAdapter } from './AuthAdapter';
import type { CurrentAccount } from '../../types/api';

const OWNER_ACCOUNT: CurrentAccount = {
  account: {
    id: 'usr_owner_daleel_2026',
    email: 'owner@daleel.ai',
    displayName: 'Omar Salama',
  },
  workspace: {
    id: 'ws_personal_8820',
    name: 'Personal Workspace',
    role: 'owner',
    dataRegion: 'aws-us-east-1 (Cloud Run)',
  },
};

const OPERATOR_ACCOUNT: CurrentAccount = {
  account: {
    id: 'usr_operator_daleel_2026',
    email: 'operator@daleel.ai',
    displayName: 'Platform Operator',
  },
  workspace: {
    id: 'ws_platform_ops_01',
    name: 'Platform Operations Admin',
    role: 'operator',
    dataRegion: 'aws-us-east-1 (Cloud Run)',
  },
};

export class MockAuthAdapter implements AuthAdapter {
  private currentAccount: CurrentAccount | null = OWNER_ACCOUNT;
  private token: string | null = 'mock_jwt_daleel_bearer_token_verified';

  async init(): Promise<void> {
    const savedRole = localStorage.getItem('daleel_mock_role');
    if (savedRole === 'operator') {
      this.currentAccount = OPERATOR_ACCOUNT;
    } else if (savedRole === 'signed_out') {
      this.currentAccount = null;
      this.token = null;
    } else {
      this.currentAccount = OWNER_ACCOUNT;
    }
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async getCurrentAccount(): Promise<CurrentAccount | null> {
    return this.currentAccount;
  }

  async signIn(email: string, _password: string): Promise<CurrentAccount> {
    if (email.toLowerCase().includes('operator')) {
      this.currentAccount = OPERATOR_ACCOUNT;
      localStorage.setItem('daleel_mock_role', 'operator');
    } else {
      this.currentAccount = {
        ...OWNER_ACCOUNT,
        account: {
          ...OWNER_ACCOUNT.account,
          email,
        },
      };
      localStorage.setItem('daleel_mock_role', 'owner');
    }
    this.token = 'mock_jwt_daleel_bearer_token_verified';
    return this.currentAccount;
  }

  async signOut(): Promise<void> {
    this.currentAccount = null;
    this.token = null;
    localStorage.setItem('daleel_mock_role', 'signed_out');
  }

  async claimInvitation(_token: string): Promise<CurrentAccount> {
    this.currentAccount = OWNER_ACCOUNT;
    this.token = 'mock_jwt_daleel_bearer_token_verified';
    localStorage.setItem('daleel_mock_role', 'owner');
    return this.currentAccount;
  }

  async switchRole(role: 'owner' | 'operator'): Promise<CurrentAccount> {
    if (role === 'operator') {
      this.currentAccount = OPERATOR_ACCOUNT;
      localStorage.setItem('daleel_mock_role', 'operator');
    } else {
      this.currentAccount = OWNER_ACCOUNT;
      localStorage.setItem('daleel_mock_role', 'owner');
    }
    this.token = 'mock_jwt_daleel_bearer_token_verified';
    return this.currentAccount;
  }
}
