import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('a seven-cent AI budget is accepted without a floating-point validation error', async ({ app, screen }) => {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('AI Engineer seven-cent budget');
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/job');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Standard run limits & budget caps').tap();
  await screen.getByLabel('AI cap ($0.00–$0.25)').fill('0.07');
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  const s = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
  const run = s.resources.find((r: any) => r.kind === 'run' && r.data.query === 'AI Engineer seven-cent budget').data;
  expect(run.aiUsageCapUsd).toBe(0.07);
});
