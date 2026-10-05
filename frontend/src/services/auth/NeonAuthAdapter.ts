import { createInternalNeonAuth } from '@neondatabase/neon-js/auth';
import type { AuthAdapter } from './AuthAdapter';
import type { CurrentAccount } from '../../types/api';

export class NeonAuthAdapter implements AuthAdapter {
  private client = import.meta.env.VITE_NEON_AUTH_URL ? createInternalNeonAuth(import.meta.env.VITE_NEON_AUTH_URL) : null;
  private account: CurrentAccount | null = null;
  private development = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'development';
  private signedOut = false;
  private base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  private configured() {
    if (!this.client) throw new Error('Neon sign-in is not configured. Set VITE_NEON_AUTH_URL.');
    return this.client.adapter;
  }
  async getToken(): Promise<string | null> {
    if (this.signedOut) return null;
    if (this.development) return import.meta.env.VITE_DEV_TOKEN || null;
    return this.client ? this.client.getJWTToken() : null;
  }
  private async request(path: string, method = 'GET') {
    const token = await this.getToken();
    const response = await fetch(this.base + path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await response.json();
    if (!response.ok) throw data;
    return data as CurrentAccount;
  }
  async init() { try { this.account = await this.request('/me'); } catch { this.account = null; } }
  async getCurrentAccount() { return this.account; }
  async signIn(email: string, password: string) {
    this.signedOut = false;
    if (!this.development) {
      const result = await this.configured().signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || 'Sign-in failed');
    }
    this.account = await this.request('/me');
    return this.account;
  }
  async registerInvited(email: string, password: string) {
    const result = await this.configured().signUp.email({ email, password, name: email.split('@')[0] });
    if (result.error) throw new Error(result.error.message || 'Account creation failed');
    this.signedOut = false;
  }
  async resetPassword(email: string) {
    const result = await this.configured().requestPasswordReset({ email, redirectTo: `${window.location.origin}/sign-in` });
    if (result.error) throw new Error('Unable to request password reset');
  }
  async signOut() {
    if (!this.development && this.client) await this.client.adapter.signOut();
    this.signedOut = true;
    this.account = null;
  }
  async claimInvitation(token: string) {
    this.account = await this.request(`/invitations/${encodeURIComponent(token)}/claim`, 'POST');
    return this.account;
  }
  async switchRole(): Promise<CurrentAccount> { throw new Error('Workspace roles are assigned by the server'); }
}
