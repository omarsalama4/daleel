import type { AuthAdapter } from './AuthAdapter';
import type { CurrentAccount } from '../../types/api';

/**
 * NeonAuthAdapter - Handles communication with Neon Managed Better Auth
 * Supplies short-lived JWTs to FastAPI bearer headers as defined in PRD & FRONTEND_READINESS.md.
 */
export class NeonAuthAdapter implements AuthAdapter {
  private token: string | null = null;
  private currentAccount: CurrentAccount | null = null;

  async init(): Promise<void> {
    // When live @neondatabase/auth is mounted, token is acquired from the SDK:
    // const authClient = createAuthClient();
    // this.token = await authClient.token();
    try {
      const res = await fetch('/api/v1/me', {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });
      if (res.ok) {
        this.currentAccount = await res.json();
      }
    } catch {
      // In standalone/mock mode, this safely falls back
    }
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async getCurrentAccount(): Promise<CurrentAccount | null> {
    return this.currentAccount;
  }

  async signIn(email: string, password: string): Promise<CurrentAccount> {
    const res = await fetch('/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error('Authentication failed');
    }
    const data = await res.json();
    this.token = data.token;
    this.currentAccount = data.account;
    return this.currentAccount!;
  }

  async signOut(): Promise<void> {
    this.token = null;
    this.currentAccount = null;
    await fetch('/api/v1/auth/sign-out', { method: 'POST' }).catch(() => {});
  }

  async claimInvitation(token: string): Promise<CurrentAccount> {
    const res = await fetch(`/api/v1/invitations/${encodeURIComponent(token)}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error('Failed to claim invitation');
    }
    this.currentAccount = await res.json();
    return this.currentAccount!;
  }

  async switchRole(_role: 'owner' | 'operator'): Promise<CurrentAccount> {
    return this.currentAccount!;
  }
}
