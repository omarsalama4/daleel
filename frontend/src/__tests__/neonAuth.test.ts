import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const methods = vi.hoisted(() => ({ verify: vi.fn(), resend: vi.fn(), signup: vi.fn(), token: vi.fn() }));
vi.mock('@neondatabase/neon-js/auth', () => ({ createInternalNeonAuth: () => ({
  adapter: { emailOtp: { verifyEmail: methods.verify, sendVerificationOtp: methods.resend }, signUp: { email: methods.signup } },
  getJWTToken: methods.token,
}) }));
import { NeonAuthAdapter } from '../services/auth/NeonAuthAdapter';
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('VITE_NEON_AUTH_URL', 'https://auth.invalid/auth'); vi.stubEnv('VITE_AUTH_MODE', 'neon');
  methods.verify.mockResolvedValue({ error: null }); methods.resend.mockResolvedValue({ error: null });
  methods.signup.mockResolvedValue({ error: null }); methods.token.mockResolvedValue('synthetic-issued-token');
});
afterEach(() => vi.unstubAllEnvs());
describe('Neon free-provider email verification', () => {
  it('verifies the invited email with its code and allows token retrieval', async () => {
    const adapter = new NeonAuthAdapter();
    await adapter.verifyEmailCode('invited@test.invalid', '123456');
    expect(methods.verify).toHaveBeenCalledWith({ email: 'invited@test.invalid', otp: '123456' });
    expect(await adapter.getToken()).toBe('synthetic-issued-token');
  });
  it('requests an email-verification code without password data', async () => {
    await new NeonAuthAdapter().resendEmailCode('invited@test.invalid');
    expect(methods.resend).toHaveBeenCalledWith({ email: 'invited@test.invalid', type: 'email-verification' });
  });
  it('surfaces rejected verification without claiming a workspace', async () => {
    methods.verify.mockResolvedValue({ error: { message: 'Expired verification code' } });
    await expect(new NeonAuthAdapter().verifyEmailCode('invited@test.invalid', '000000')).rejects.toThrow('Expired verification code');
  });
});
