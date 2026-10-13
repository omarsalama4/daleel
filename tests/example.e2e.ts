import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('app opens into the personal workspace', async ({ app, screen, browser }) => {
  await app.open('/app');
  await expect(screen.getByText('Personal workspace', { exact: true })).toBeVisible();
  await expect(browser).toHaveURL('/app');
});

