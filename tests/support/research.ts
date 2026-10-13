import { expect } from 'e2e';
export async function snapshot(app: any) {
  return fetch(new URL('/api/__e2e__/snapshot', app.baseUrl)).then(r => r.json());
}
export async function createPlan(app: any, screen: any, query: string, seed: string, pages?: number) {
  await app.open('/app/new');
  await screen.getByLabel(/Research question or objective/).fill(query);
  await screen.getByPlaceholder('https://example.com/jobs').fill(seed);
  await screen.getByRole('button', 'Add URL').tap();
  if (pages) {
    await screen.getByRole('button', 'Standard run limits & budget caps').tap();
    await screen.getByLabel('Max pages (1–500)').fill(String(pages));
  }
  await screen.getByRole('button', 'Review plan').tap();
  await expect(screen.getByRole('heading', 'Generated research plan')).toBeVisible();
  const s = await snapshot(app);
  return s.resources.filter((r: any) => r.kind === 'run' && r.data.query === query).at(-1).data;
}
export async function finish(app: any, screen: any, run: any) {
  await screen.getByRole('button', 'Approve and run').tap();
  await expect.poll(async () => {
    const s = await snapshot(app);
    return s.resources.find((r: any) => r.kind === 'run' && r.data.id === run.id)?.data.status;
  }, { timeout: 45_000 }).toMatch(/^(complete|partial)$/);
}
