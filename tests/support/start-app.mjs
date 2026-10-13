import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

const token = randomBytes(32).toString('hex');
const python = process.platform === 'win32' ? 'backend/.venv/Scripts/python.exe' : 'backend/.venv/bin/python';
const children = [];
const environment = { ...process.env, DALEEL_E2E_TOKEN: token };
let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function start(executable, args, env) {
  const child = spawn(executable, args, { env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); shutdown(1); });
  child.on('exit', code => { if (!stopping) shutdown(code ?? 1); });
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
start(resolve(python), ['tests/support/server.py'], environment);
const deadline = Date.now() + 45_000;
let ready = false;
while (!stopping && Date.now() < deadline) {
  try {
    const response = await fetch('http://127.0.0.1:8000/ready', { signal: AbortSignal.timeout(1500) });
    if (response.ok) { ready = true; break; }
  } catch { /* Backend is still initializing. */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
if (!ready) {
  console.error('Disposable E2E backend did not become ready.');
  shutdown(1);
} else {
start(process.execPath, ['tests/support/ui.mjs'], {
  ...environment, VITE_API_BASE_URL: '/api/v1', VITE_AUTH_MODE: 'development', VITE_DEV_TOKEN: token,
  VITE_DEMO_MODE: 'false', VITE_NEON_AUTH_URL: '',
});
}
