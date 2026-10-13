import { describe, expect, it } from 'vitest';
import { providerConfigurationLabel } from '../lib/providerStatus';

describe('provider configuration labels', () => {
  it('never claims unavailable credentials are active', () => {
    expect(providerConfigurationLabel(false)).toBe('Not configured');
  });
  it('describes configured credentials without claiming live health', () => {
    expect(providerConfigurationLabel(true)).toBe('Configured');
  });
  it('handles older server responses explicitly', () => {
    expect(providerConfigurationLabel(undefined)).toBe('Unknown');
  });
});
