import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createPlan, snapshot } from './support/research';

test('pause and cancel stop a run without losing its record', async ({ app, screen }) => {
  const run = await createPlan(app, screen, `Find AI Engineer opportunities slow ${Date.now()}`, 'http://127.0.0.1/slow');
  await screen.getByRole('button', 'Approve and run').tap();
  await screen.getByRole('button', 'Pause', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Resume', { exact: true })).toBeVisible();
  await screen.getByRole('button', 'Resume', { exact: true }).tap();
  await screen.getByRole('button', 'Cancel', { exact: true }).tap();
  await expect.poll(async () => {
    const s = await snapshot(app);
    return s.resources.find((r: any) => r.kind === 'run' && r.data.id === run.id)?.data.status;
  }).toBe('cancelled');
  await expect(screen.getByRole('button', 'Resume')).toHaveCount(0);
});

test('run deletion requires confirmation and removes the stored record', async ({ app, screen }) => {
  const query = `Find AI Engineer opportunities delete ${Date.now()}`;
  const run = await createPlan(app, screen, query, 'http://127.0.0.1/job');
  await app.open('/app/runs');
  const row = screen.getByRole('row').filter({ hasText: query });
  await row.getByRole('button', 'Cancel run').tap();
  await row.getByRole('button', 'Delete run record').tap();
  await screen.getByRole('button', 'Cancel', { exact: true }).tap();
  expect((await snapshot(app)).resources.some((r: any) => r.kind === 'run' && r.data.id === run.id)).toBe(true);
  await row.getByRole('button', 'Delete run record').tap();
  await screen.getByRole('button', 'Delete run', { exact: true }).tap();
  await expect.poll(async () => {
    const s = await snapshot(app);
    return s.resources.some((r: any) => r.kind === 'run' && r.data.id === run.id);
  }).toBe(false);
});
