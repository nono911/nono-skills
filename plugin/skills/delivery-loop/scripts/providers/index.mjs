import { assertAdapter } from '../provider-contract.mjs';
import { antigravityAdapter } from './antigravity.mjs';
import { claudeAdapter } from './claude.mjs';
import { codeWhaleAdapter } from './codewhale.mjs';
import { codexAdapter } from './codex.mjs';
import { openCodeAdapter } from './opencode.mjs';
import { qwenAdapter } from './qwen.mjs';

const adapters = [
  claudeAdapter,
  codexAdapter,
  qwenAdapter,
  openCodeAdapter,
  codeWhaleAdapter,
  antigravityAdapter,
].map(assertAdapter);

export const providerAdapters = Object.freeze(Object.fromEntries(
  adapters.map((adapter) => [adapter.name, Object.freeze(adapter)]),
));

export {
  antigravityAdapter,
  claudeAdapter,
  codeWhaleAdapter,
  codexAdapter,
  openCodeAdapter,
  qwenAdapter,
};
