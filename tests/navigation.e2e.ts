import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

for (const [route, heading] of [
  ['/app/runs', 'Research runs'],
  ['/app/workflows', 'Saved Workflows'],
  ['/app/recipes', 'Automation recipes'],
  ['/app/shared', 'Shared with me'],
  ['/app/settings/account', 'Account & workspace'],
  ['/app/settings/ai', 'AI processing & provider policy'],
  ['/app/settings/limits', 'Limits, storage & data deletion'],
  ['/admin/invitations', 'Operator beta invitations'],
  ['/admin/workspaces', 'Operator workspace operations'],
  ['/admin/access-audit', 'Internal operator access audit'],
]) {
  test(`workspace page loads: ${heading}`, async ({ app, screen }) => {
    await app.open(route);
    await expect(screen.getByRole('heading', heading)).toBeVisible();
    await expect(screen.getByText(/Failed to load/)).toHaveCount(0);
  });
}

test('optional research preferences are preserved in the submitted query', async ({ app, screen }) => {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill('Find AI Engineer opportunities');
  await screen.getByLabel('Preferred sites, language, or exclusion notes (Optional)').fill('Prefer Arabic job descriptions');
  await screen.getByPlaceholder('https://example.com/jobs').fill('http://127.0.0.1/job');
  await screen.getByRole('button', 'Add URL').tap();
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  const s = await fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
  expect(s.resources.some((r: any) => r.kind === 'run' && r.data.query.includes('Preferences: Prefer Arabic job descriptions'))).toBe(true);
});
