import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpApiClient } from '../services/api/HttpApiClient';
import type { CreateRun } from '../types/api';

afterEach(() => vi.unstubAllGlobals());

describe('Production HTTP client', () => {
  it('sends authorization, idempotency and trace context for run admission', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'run-id' }), { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    const api = new HttpApiClient(async () => 'local-test-token');
    await api.createRun({ query: 'Find opportunities' } as CreateRun, 'admission-id');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('/api/v1/runs');
    expect(options.headers.Authorization).toBe('Bearer local-test-token');
    expect(options.headers['Idempotency-Key']).toBe('admission-id');
    expect(options.headers.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
  });

  it('propagates server authorization errors without substituting mock data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 401, code: 'UNAUTHENTICATED', detail: 'Sign in',
    }), { status: 401 })));
    const api = new HttpApiClient(async () => null);
    await expect(api.getCurrentAccount()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
