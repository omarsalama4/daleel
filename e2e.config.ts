import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { chatgpt } from 'e2e/oauth/chatgpt';

export default {
  workers: 1,
  retries: 0,
  timeout: 180_000,
  assertionTimeout: 15_000,
  reporters: ['list', 'junit', 'markdown'],
  agents: {
    default: {
      model: chatgpt('gpt-6.1-sol'),
      maxSteps: 20,
      maxModelCalls: 20,
      system: 'Test Daleel carefully. Verify each outcome. Use only the local synthetic test app; never open real accounts or external websites.',
      context: 'Daleel is an evidence-based research workspace. Approval mode requires plan approval before crawling. The local test uses a real backend and synthetic jobs without application AI credentials. Unknown fields are intentional.',
    },
  },
  targets: [{
    name: 'daleel-local',
    engine: web(),
    app: {
      url: 'http://127.0.0.1:5173',
      command: { executable: 'node', args: ['tests/support/start-app.mjs'], startupTimeout: 60_000, log: '.e2e/logs/app.log' },
      environment: 'test',
    },
  }],
} satisfies E2EConfig;
