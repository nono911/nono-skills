import assert from 'node:assert/strict';

import { canonicalSkillNames } from './plugin-contract.js';

const toolItemTypes = new Set(['command_execution', 'mcp_tool_call', 'web_search']);
const materialActionTypes = new Set(['agent_message', 'file_change', 'plan_update']);

export function assertCodexAdapterRequest(request) {
  assert.ok(request && typeof request === 'object' && !Array.isArray(request), 'adapter request must be an object');
  assert.equal(request.protocol_version, 1, 'adapter protocol_version must be 1');
  assert.match(request.case_id, /^[a-z0-9][a-z0-9-]+$/, 'adapter case_id must be kebab-case');
  assert.ok(['skill', 'baseline'].includes(request.variant), 'adapter variant must be skill or baseline');
  assert.equal(typeof request.prompt, 'string', 'adapter prompt must be a string');
  assert.ok(request.prompt.trim().length >= 20, 'adapter prompt must be representative');
  assert.equal(request.skills_enabled, request.variant === 'skill', 'skills_enabled must match the variant');
  assert.equal(request.isolation, 'fresh-session', 'adapter request must require a fresh session');
  return request;
}

export function parseCodexVersion(output) {
  const match = String(output).trim().match(/^codex-cli\s+(\S+)$/);
  if (!match) throw new Error(`Unsupported Codex version output: ${JSON.stringify(String(output).trim())}`);
  return match[1];
}

export function buildCodexExecArgs({ model, reasoningEffort, workspace, schemaFile, outputFile }) {
  if (!model?.trim()) throw new Error('Codex host eval requires an explicit --model');
  return [
    'exec',
    '--ephemeral',
    '--json',
    '--color', 'never',
    '--sandbox', 'workspace-write',
    '--ignore-rules',
    '--model', model,
    '--config', 'approval_policy="never"',
    '--config', `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
    '--cd', workspace,
    '--output-schema', schemaFile,
    '--output-last-message', outputFile,
    '-',
  ];
}

export function summarizeCodexEvents(timedEvents, durationMs) {
  const toolIds = new Set();
  let firstActionMs = null;
  let toolCallsBeforeFirstAction = 0;
  for (const entry of timedEvents) {
    const item = entry.event?.item;
    if (!item || !String(entry.event.type).startsWith('item.')) continue;
    const id = item.id ?? `${item.type}:${entry.elapsed_ms}`;
    if (toolItemTypes.has(item.type) && !toolIds.has(id)) {
      toolIds.add(id);
      if (firstActionMs === null) toolCallsBeforeFirstAction += 1;
    }
    const material = materialActionTypes.has(item.type)
      && (item.type !== 'agent_message' || entry.event.type === 'item.completed');
    if (material && firstActionMs === null) firstActionMs = entry.elapsed_ms;
  }
  return {
    duration_ms: Math.max(0, Math.round(durationMs)),
    time_to_first_action_ms: Math.max(0, Math.round(firstActionMs ?? durationMs)),
    tool_calls: toolIds.size,
    tool_calls_before_first_action: toolCallsBeforeFirstAction,
  };
}

export function assertCodexStructuredOutput(value, { skillsEnabled }) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Codex structured output must be an object');
  assert.equal(typeof value.output, 'string', 'Codex structured output.output must be a string');
  assert.ok(Array.isArray(value.activated_skills), 'Codex structured output.activated_skills must be an array');
  assert.equal(new Set(value.activated_skills).size, value.activated_skills.length, 'activated_skills must not contain duplicates');
  for (const skill of value.activated_skills) {
    assert.ok(canonicalSkillNames.includes(skill), `Codex reported unknown nono-skills activation ${skill}`);
  }
  for (const name of ['loaded_skill_bodies', 'loaded_references', 'questions']) {
    assert.ok(Number.isInteger(value[name]) && value[name] >= 0, `${name} must be a non-negative integer`);
  }
  if (!skillsEnabled) {
    assert.deepEqual(value.activated_skills, [], 'baseline must not report nono-skills activations');
    assert.equal(value.loaded_skill_bodies, 0, 'baseline must not report loaded nono-skills bodies');
    assert.equal(value.loaded_references, 0, 'baseline must not report loaded nono-skills references');
  }
  return value;
}

export const codexOutputSchema = Object.freeze({
  type: 'object',
  properties: {
    output: { type: 'string' },
    activated_skills: {
      type: 'array',
      items: { type: 'string', enum: canonicalSkillNames },
    },
    loaded_skill_bodies: { type: 'integer', minimum: 0 },
    loaded_references: { type: 'integer', minimum: 0 },
    questions: { type: 'integer', minimum: 0 },
  },
  required: [
    'output',
    'activated_skills',
    'loaded_skill_bodies',
    'loaded_references',
    'questions',
  ],
  additionalProperties: false,
});
