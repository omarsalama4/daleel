import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('app opens into the personal workspace', async ({ app, screen, browser }) => {
  await app.open('/app');
  await expect(screen.getByText('Personal workspace', { exact: true })).toBeVisible();
  await expect(browser).toHaveURL('/app');
});

// With the model key in the environment, uncomment:
// test('the agent drives a flow', async ({ app, agent }) => {
//   await app.open('/');
//   await agent.act('one goal in natural language');
//   await agent.assert('one question about the screen');
// });
