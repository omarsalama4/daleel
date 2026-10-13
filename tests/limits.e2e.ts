import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('zero AI budget and seed-only depth are accepted and persisted in the plan', async ({ app, screen }) => {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('Find AI Engineer opportunities');
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/job');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Standard run limits & budget caps').tap();
  await screen.getByLabel('AI cap ($0.00–$0.25)').fill('0');
  await expect(screen.getByLabel('AI cap ($0.00–$0.25)')).toHaveValue('0');
  await screen.getByLabel('Max depth (0–5)').fill('0');
  await expect(screen.getByLabel('Max depth (0–5)')).toHaveValue('0');
  await screen.getByLabel('Retries per page (0–2)').fill('0');
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  const snapshot = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
  const run = snapshot.resources.filter((r: any) => r.kind === 'run' && r.data.limits.depth === 0).at(-1).data;
  expect(run.limits.depth).toBe(0);
  expect(run.limits.retriesPerPage).toBe(0);
  expect(run.aiUsageCapUsd).toBe(0);
});
