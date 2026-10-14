import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createPlan, snapshot } from './support/research';

test('browser planner proposes a control, waits for review and resumes with an approved reusable recipe', async ({ app, screen }) => {
  const configure = (enabled: boolean) => fetch(new URL(`/api/__e2e__/browser-planner/${enabled}`, app.baseUrl), { method: 'POST' });
  await configure(true);
  try {
    const run = await createPlan(app, screen, `AI Engineer Cairo ${Date.now()}`, 'http://127.0.0.1/planner');
    await screen.getByRole('button', 'Approve and run').tap();
    await expect.poll(async () => (await snapshot(app)).resources.find((r: any) => r.kind === 'run' && r.data.id === run.id)?.data.status,
      { timeout: 45_000 }).toBe('needs_attention');
    await app.open(`/app/runs/${run.id}`);
    await expect(screen.getByRole('heading', 'Action Required: Review proposed browser steps')).toBeVisible();
    const blocked = (await snapshot(app)).resources.find((r: any) => r.kind === 'run' && r.data.id === run.id).data;
    const recipeId = blocked.activeGate.recipeId;
    expect((await snapshot(app)).resources.filter((r: any) => r.kind === 'finding' && r.data.runId === run.id)).toHaveLength(0);
    await screen.getByRole('button', 'Review browser recipe').tap();
    await screen.getByRole('button', 'Mark Previewed').tap();
    await screen.getByRole('button', 'Approve Recipe').tap();
    await screen.getByRole('button', 'Validate Replay & Activate').tap();
    await expect(screen.getByRole('button', 'Retire Recipe')).toBeVisible({ timeout: 30_000 });
    const approved = (await snapshot(app)).resources.find((r: any) => r.kind === 'recipe' && r.data.id === recipeId).data;
    expect(approved.browserSteps[0].selector).toBe('#expand');
    await app.open(`/app/runs/${run.id}`);
    await screen.getByRole('button', 'Continue after recipe approval and successful replay').tap();
    await expect.poll(async () => (await snapshot(app)).resources.find((r: any) => r.kind === 'run' && r.data.id === run.id)?.data.status,
      { timeout: 45_000 }).toMatch(/^(complete|partial)$/);
    const finding = (await snapshot(app)).resources.find((r: any) => r.kind === 'finding' && r.data.runId === run.id).data;
    expect(finding.values.description.value).toContain('Build reliable AI models');
    expect(finding.values.description.evidenceState).toBe('verified');
  } finally {
    await configure(false);
  }
});
