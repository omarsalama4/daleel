import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('sign-in explains MFA, requires opening the browser and preserves failed validation for retry', async ({ app, screen, browser }) => {
  await browser.route('**/api/v1/sessions/connections/synthetic-connection', route => route.fulfill({ status: 204, body: '' }));
  await browser.route('**/api/v1/sessions', async route => {
    if (route.request.method === 'POST') await route.fulfill({ status: 201, json: {
      id: 'synthetic-connection', domain: 'research.example', browserUrl: `${app.baseUrl}/api/__e2e__/viewer`,
      state: 'connecting', expiresAt: new Date(Date.now() + 1800000).toISOString(),
    } });
    else await route.fallback();
  });
  await browser.route('**/sessions/connections/synthetic-connection/finish', route => route.fulfill({ status: 409,
    json: { code: 'SESSION_NOT_VALIDATED', detail: 'Return to a normal signed-in site page and retry.' } }));
  await app.open('/app/sessions');
  await screen.getByPlaceholder('e.g. wellfound.com').fill('research.example');
  await screen.getByRole('button', 'Connect site').tap();
  await expect(screen.getByText(/Verification codes come from the site/)).toBeVisible();
  await expect(screen.getByRole('button', 'Finish connection')).toBeDisabled();
  await screen.getByRole('link', 'Open hosted browser').tap();
  await expect(screen.getByRole('button', 'Finish connection')).toBeEnabled();
  await screen.getByRole('button', 'Finish connection').tap();
  await expect(screen.getByRole('alert')).toContainText('Return to a normal signed-in site page');
  await expect(screen.getByRole('button', 'Start a new connection')).toBeVisible();
  await screen.getByRole('button', 'Start a new connection').tap();
  await expect(screen.getByRole('button', 'Finish connection')).toBeDisabled();
  await expect(screen.getByRole('link', 'Open hosted browser')).toBeVisible();
});

test('hosted viewer image, zoom, scrolling, expiry and close controls work on mobile', async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await app.open('/api/__e2e__/viewer');
  await expect(screen.getByRole('heading', 'Sign in to research.example')).toBeVisible();
  await app.screenshot('hosted-sign-in-mobile');
  await expect.poll(() => browser.evaluate(() => (document.querySelector('#screen') as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await screen.getByRole('button', 'Fit to window').tap();
  await screen.getByRole('button', 'Actual size').tap();
  await expect(screen.getByRole('button', 'Fit to window')).toBeVisible();
  await screen.getByText('Keyboard & scrolling').tap();
  await screen.getByRole('button', 'Scroll up').tap();
  await expect.poll(async () => {
    const s = await fetch(new URL('/api/__e2e__/viewer-events', app.baseUrl)).then(r => r.json());
    return s.some((e: any) => e.action === 'scroll' && e.y < 0);
  }).toBe(true);
  await screen.getByRole('button', 'Show text').tap();
  await screen.getByLabel('Text for the selected remote field').fill('synthetic-input');
  await screen.getByRole('button', 'Send text').tap();
  await expect(screen.getByRole('button', 'Show text')).toBeVisible();
  await browser.onDialog('accept');
  await screen.getByRole('button', 'Close isolated browser').tap();
  await expect(screen.getByRole('alert')).toContainText('Browser closed');
  await expect(screen.getByRole('button', 'Send text')).toBeDisabled();
});

test('expired hosted viewer stops controls with an actionable message', async ({ app, screen, browser }) => {
  await browser.route('**/api/__e2e__/viewer/status', route => route.fulfill({ status: 410, json: { detail: 'Expired' } }));
  await app.open('/api/__e2e__/viewer');
  await expect(screen.getByRole('alert')).toContainText('Connection expired');
  await expect(screen.getByRole('button', 'Send text')).toBeDisabled();
});
