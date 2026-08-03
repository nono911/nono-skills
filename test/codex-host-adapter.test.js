import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  assertCodexAdapterRequest,
  assertCodexStructuredOutput,
  buildCodexExecArgs,
  parseCodexVersion,
  summarizeCodexEvents,
} from '../src/codex-host-adapter.js';

const root = path.resolve(import.meta.dirname, '..');

test('Codex adapter validates paired fresh-session requests', () => {
  const request = {
    protocol_version: 1,
    case_id: 'plan-fast-path',
    variant: 'skill',
    prompt: 'Use $plan to produce an acceptance plan with evidence.',
    skills_enabled: true,
    isolation: 'fresh-session',
  };
  assert.equal(assertCodexAdapterRequest(request), request);
  assert.throws(
    () => assertCodexAdapterRequest({ ...request, variant: 'baseline' }),
    /skills_enabled must match/,
  );
});

test('Codex adapter pins model, effort, workspace, schema, and noninteractive safety', () => {
  const args = buildCodexExecArgs({
    model: 'gpt-test',
    reasoningEffort: 'high',
    workspace: '/tmp/workspace',
    schemaFile: '/tmp/schema.json',
    outputFile: '/tmp/output.json',
  });
  assert.deepEqual(args.slice(0, 5), ['exec', '--ephemeral', '--json', '--color', 'never']);
  assert.ok(args.includes('gpt-test'));
  assert.ok(args.includes('model_reasoning_effort="high"'));
  assert.ok(args.includes('approval_policy="never"'));
  assert.equal(args.at(-1), '-');
  assert.equal(parseCodexVersion('codex-cli 0.146.0\n'), '0.146.0');
});

test('Codex JSONL metrics count inspection before the first material action', () => {
  const summary = summarizeCodexEvents([
    {
      elapsed_ms: 10,
      event: { type: 'item.started', item: { id: 'cmd-1', type: 'command_execution' } },
    },
    {
      elapsed_ms: 20,
      event: { type: 'item.completed', item: { id: 'cmd-1', type: 'command_execution' } },
    },
    {
      elapsed_ms: 30,
      event: { type: 'item.started', item: { id: 'edit-1', type: 'file_change' } },
    },
    {
      elapsed_ms: 50,
      event: { type: 'item.completed', item: { id: 'msg-1', type: 'agent_message' } },
    },
  ], 60);
  assert.deepEqual(summary, {
    duration_ms: 60,
    time_to_first_action_ms: 30,
    tool_calls: 1,
    tool_calls_before_first_action: 1,
  });
});

test('Codex structured baseline rejects hidden nono-skills activation', () => {
  const output = {
    output: 'done',
    activated_skills: [],
    loaded_skill_bodies: 0,
    loaded_references: 0,
    questions: 0,
  };
  assert.equal(assertCodexStructuredOutput(output, { skillsEnabled: false }), output);
  assert.throws(
    () => assertCodexStructuredOutput({
      ...output,
      activated_skills: ['plan'],
      loaded_skill_bodies: 1,
    }, { skillsEnabled: false }),
    /baseline must not report/,
  );
});

test('stable host fixture exposes the intended passing behavior and null defect', async () => {
  const fixture = path.join(root, 'evals', 'fixtures', 'stable-repository');
  const parser = await import(pathToFileURL(path.join(fixture, 'src', 'parser.js')));
  assert.deepEqual(parser.parseItems({ items: [' one ', 'two'] }), ['one', 'two']);
  assert.throws(() => parser.parseItems(null), /items/);
  assert.equal(parser.parseRetryCount(0), 0);
});
