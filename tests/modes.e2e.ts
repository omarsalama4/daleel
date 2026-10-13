import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createPlan, finish, snapshot } from './support/research';

test('autonomous mode starts immediately and does not save a workflow implicitly', async ({ app, screen, browser }) => {
  const before = await snapshot(app);
  const workflows = before.resources.filter((r: any) => r.kind === 'workflow').length;
  const query = `AI Engineer Cairo autonomous ${Date.now()}`;
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill(query);
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/job');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('radio', /Autonomous mode/).check();
  await screen.getByRole('button', 'Start autonomous run').tap();
  await expect(browser).toHaveURL(/\/app\/runs\//);
  await expect.poll(async () => {
    const s = await snapshot(app);
    return s.resources.find((r: any) => r.kind === 'run' && r.data.query === query)?.data.status;
  }, { timeout: 45_000 }).toBe('complete');
  const after = await snapshot(app);
  expect(after.resources.filter((r: any) => r.kind === 'workflow')).toHaveLength(workflows);
});

test('Arabic opportunity details retain Unicode and verified source evidence', async ({ app, screen }) => {
  const run = await createPlan(app, screen, 'مهندس ذكاء اصطناعي', 'http://127.0.0.1/arabic');
  await finish(app, screen, run);
  const s = await snapshot(app);
  const detail = s.resources.find((r: any) => r.kind === 'finding' && r.data.runId === run.id).data;
  expect(detail.values.title.value).toBe('مهندس ذكاء اصطناعي');
  expect(detail.values.description.value).toContain('نماذج');
  expect(detail.values.description.evidenceState).toBe('verified');
  await app.open(`/app/runs/${run.id}/results/${detail.id}`);
  await expect(screen.getByRole('heading', 'مهندس ذكاء اصطناعي')).toBeVisible();
});
