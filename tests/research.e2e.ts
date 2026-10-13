import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

async function research({ app, agent, screen, browser }: any, useAgent: boolean) {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('Find AI Engineer opportunities in Cairo Egypt');
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  const planSnapshot = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
  const run = planSnapshot.resources.filter((r: any) => r.kind === 'run').at(-1).data;
  expect(run.status).toBe('awaiting_approval');
  expect(planSnapshot.tasks.filter((t: any) => t.runId === run.id && t.state === 'succeeded')).toHaveLength(0);
  if (useAgent) await agent.act('Approve the generated research plan and start the run.');
  else await screen.getByRole('button', 'Approve and run').tap();
  await expect(browser).toHaveURL(new RegExp(`/app/runs/${run.id}`));
  await expect.poll(async () => {
    const s = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
    return s.resources.find((r: any) => r.kind === 'run' && r.data.id === run.id)?.data.status;
  }, { timeout: 45_000 }).toBe('complete');
  await app.open(`/app/runs/${run.id}/results`);
  await expect(screen.getByRole('button', 'Export results')).toBeVisible();
  const snapshot = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
  const findings = snapshot.resources.filter((r: any) => r.kind === 'finding' && r.data.runId === run.id).map((r: any) => r.data);
  const detail = findings.find((f: any) => f.sourceUrl.endsWith('/job') && f.status !== 'duplicate') || findings.find((f: any) => f.values.employer?.value === 'Daleel Test Labs' && f.status !== 'duplicate');
  expect(detail.values.description.evidenceState).toBe('verified');
  expect(detail.values.description.value).toContain('Build reliable AI models');
  expect(findings.filter((f: any) => f.status === 'duplicate')).toHaveLength(1);
  expect(snapshot.spendCount).toBe(0);
  await screen.getByRole('button', 'Export results').tap();
  await screen.getByRole('button', 'Structured JSON').tap();
  await screen.getByRole('button', 'Generate export').tap();
  await expect(screen.getByRole('link', 'Download')).toBeVisible();
  const href = await screen.getByRole('link', 'Download').getAttribute('href');
  const response = await fetch(new URL(href!, app.baseUrl));
  expect(response.status).toBe(200);
  const content = await response.text();
  const download = await browser.waitForDownload(() => screen.getByRole('link', 'Download').tap());
  expect(download.suggestedFilename).toMatch(/\.json$/);
  expect(content).toContain('AI Engineer');
  expect(content).toContain('Build reliable AI models');
  expect(JSON.parse(content)).toBeDefined();
  expect(content).not.toMatch(/DALEEL_E2E_TOKEN|access_token|refresh_token|sessionCookie/i);
  await app.open(`/app/runs/${run.id}/results/${detail.id}`);
  await expect(screen.getByRole('heading', 'AI Engineer')).toBeVisible();
  await expect(screen.getByText('Structured Output Fields')).toBeVisible();
  if (useAgent) await agent.assert('The finding shows an AI Engineer opportunity with source links and field-level evidence, without inventing a salary.');
}

test('query approval discovers job details with grounded evidence and deduplicates', { tags: ['research'] }, async fixtures => {
  await research(fixtures, false);
});

test('ChatGPT agent completes research approval and judges evidence', { tags: ['agent', 'research'] }, async fixtures => {
  await research(fixtures, true);
});
