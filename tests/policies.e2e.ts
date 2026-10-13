import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createPlan, finish, snapshot } from './support/research';

test('robots exclusion is accounted for without fetching the prohibited page', async ({ app, screen }) => {
  const run = await createPlan(app, screen, 'Find AI Engineer opportunities robots policy', 'http://127.0.0.1/blocked');
  await finish(app, screen, run);
  const s = await snapshot(app);
  expect(s.sourceRequests.filter((p: string) => p.startsWith('/blocked'))).toHaveLength(0);
  const task = s.tasks.find((t: any) => t.runId === run.id && t.result?.reason === 'ROBOTS_DISALLOWED');
  expect(task).toBeDefined();
  await app.open(`/app/runs/${run.id}/coverage`);
  await expect(screen.getByRole('heading', 'Crawl Coverage & Site Topology')).toBeVisible();
});

test('page limit reports partial coverage without claiming completeness', async ({ app, screen }) => {
  const run = await createPlan(app, screen, 'Find AI Engineer opportunities page limit', 'http://127.0.0.1/', 1);
  await finish(app, screen, run);
  const s = await snapshot(app);
  const finished = s.resources.find((r: any) => r.kind === 'run' && r.data.id === run.id).data;
  expect(finished.status).toBe('partial');
  expect(finished.usage.pagesFetched).toBe(1);
  await app.open(`/app/runs/${run.id}/results`);
  await expect(screen.getByText('Partial results. Review coverage and skipped pages before drawing conclusions.')).toBeVisible();
});

test('unsafe seed and malformed web address fail visibly', async ({ app, screen }) => {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('Find AI Engineer opportunities');
  await screen.getByPlaceholder('https://example.com/jobs').fill('file:///etc/passwd');
  await screen.getByRole('button', 'Add URL').tap();
  await expect(screen.getByText('Please enter a valid web address (http:// or https://).')).toBeVisible();
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://169.254.169.254/');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('alert')).toContainText(/private|blocked|public|metadata/i);
});
