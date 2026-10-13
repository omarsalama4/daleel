import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('explicitly saved workflow restores its query and scope for reuse', async ({ app, screen }) => {
  const name = `Cairo opportunities ${Date.now()}`;
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('Find AI Engineer opportunities in Cairo');
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/job');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  await screen.getByRole('button', 'Save workflow').tap();
  await screen.getByPlaceholder('Enter memorable workflow name (e.g. AI Opportunity Scanner)').fill(name);
  await screen.getByRole('button', 'Confirm save').tap();
  const url = new URL('/api/__e2e__/snapshot', app.baseUrl);
  await expect.poll(async () => {
    const s = await fetch(url).then(r => r.json());
    return s.resources.some((r: any) => r.kind === 'workflow' && r.data.name === name);
  }).toBe(true);
  const snapshot = await fetch(url).then(r => r.json());
  const workflow = snapshot.resources.find((r: any) => r.kind === 'workflow' && r.data.name === name).data;
  await app.open(`/app/workflows/${workflow.id}`);
  await screen.getByRole('link', 'Run as new version').tap();
  await expect(screen.getByLabel(/Research question or objective/)).toHaveValue('Find AI Engineer opportunities in Cairo');
  await expect(screen.getByRole('button', /Remove seed URL/)).toHaveCount(1);
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  await expect.poll(async () => {
    const s = await fetch(url).then(r => r.json());
    return s.resources.filter((r: any) => r.kind === 'run' && r.data.workflowId === workflow.id).length;
  }).toBe(1);
});
