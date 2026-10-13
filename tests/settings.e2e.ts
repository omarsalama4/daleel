import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('private-content consent defaults off and monthly budget persists', async ({ app, screen, browser }) => {
  await app.open('/app/settings/ai');
  await expect(screen.getByRole('checkbox', 'Allow hosted AI processing of authenticated content')).not.toBeChecked();
  await screen.getByRole('spinbutton').fill('1.25');
  await screen.getByRole('button', 'Save AI settings').tap();
  await browser.reload();
  await expect(screen.getByRole('spinbutton')).toHaveValue('1.25');
  await expect(screen.getByText('Disabled', { exact: true })).toBeVisible();
});

test('invalid reset link never accepts a new password', async ({ app, screen }) => {
  await app.open('/reset-password');
  await expect(screen.getByText('This reset link is invalid. Request another from sign-in.')).toBeVisible();
  await expect(screen.getByRole('button', 'Update password')).toHaveCount(0);
});

test('unsupported connected site reports a clear failure', async ({ app, screen }) => {
  await app.open('/app/sessions');
  await screen.getByPlaceholder('e.g. wellfound.com').fill('example.org');
  await screen.getByRole('button', 'Connect site').tap();
  await expect(screen.getByText('Hosted sign-in requires a configured isolated browser broker')).toBeVisible();
});

test('narrow viewport keeps workspace navigation usable', async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await app.open('/app');
  await screen.getByRole('button', 'Toggle navigation menu').tap();
  await expect(screen.getByRole('link', 'Sessions', { visible: true })).toBeVisible();
  await screen.getByRole('link', 'Sessions', { visible: true }).tap();
  await expect(screen.getByRole('heading', 'Authorized site sessions')).toBeVisible();
});
