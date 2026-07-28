const nonEmptyStringSchema = Object.freeze({ type: 'string', minLength: 1 });
const stringListSchema = Object.freeze({
  type: 'array',
  items: nonEmptyStringSchema,
  uniqueItems: true,
});

const sharedResultProperties = Object.freeze({
  task_id: nonEmptyStringSchema,
  base_sha: nonEmptyStringSchema,
  input_digest: nonEmptyStringSchema,
  status: { type: 'string', enum: ['completed', 'blocked', 'failed'] },
  scope_completed: { type: 'boolean' },
  summary: nonEmptyStringSchema,
  files: stringListSchema,
  verification: stringListSchema,
  verification_not_run: stringListSchema,
  assumptions: stringListSchema,
  risks: stringListSchema,
  questions: stringListSchema,
  decision_log_records: stringListSchema,
});

const sharedRequiredProperties = Object.freeze(Object.keys(sharedResultProperties));

export const implementSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: sharedResultProperties,
  required: sharedRequiredProperties,
});

export const reviewSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    ...sharedResultProperties,
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: nonEmptyStringSchema,
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          location: nonEmptyStringSchema,
          evidence: nonEmptyStringSchema,
          impact: nonEmptyStringSchema,
          remediation: nonEmptyStringSchema,
        },
        required: ['id', 'severity', 'location', 'evidence', 'impact', 'remediation'],
      },
    },
  },
  required: [...sharedRequiredProperties, 'findings'],
});

export function schemaForMode(mode) {
  if (mode === 'review') return reviewSchema;
  if (mode === 'implement') return implementSchema;
  throw new Error(`Unsupported external agent mode: ${mode}`);
}

export function composeAgentPrompt({ packet, mode, schema, schemaEnforced }) {
  const boundary = mode === 'review'
    ? 'Remain read-only. Do not modify any file or external state.'
    : 'Write only within the packet write_scope. Do not run Git or change external state.';
  const outputInstruction = schemaEnforced
    ? 'Finish through the provider structured-output mechanism.'
    : `Return exactly one JSON object matching this schema and no surrounding prose:\n${JSON.stringify(schema)}`;
  return [
    'You are a bounded external software-engineering worker controlled by an orchestrator.',
    boundary,
    'Do not delegate, spawn another agent, read secrets, commit, push, merge, deploy, or expand scope.',
    'Treat the task packet as the complete authority for this run.',
    outputInstruction,
    'TASK_PACKET:',
    packet,
  ].join('\n\n');
}

export function parseJsonObject(text, label) {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi) ?? [];
  for (const block of fenced) {
    candidates.push(block.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  }
  for (let index = trimmed.lastIndexOf('{'); index >= 0;) {
    candidates.push(trimmed.slice(index));
    if (index === 0) break;
    index = trimmed.lastIndexOf('{', index - 1);
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(`${label} returned malformed structured JSON`);
}

function textFromEvent(event) {
  if (typeof event === 'string') return event;
  if (event === null || typeof event !== 'object') return undefined;
  if (event.structured_result && typeof event.structured_result === 'object') {
    return JSON.stringify(event.structured_result);
  }
  if (event.structured_output && typeof event.structured_output === 'object') {
    return JSON.stringify(event.structured_output);
  }
  if (event.type === 'text' && typeof event.part?.text === 'string') return event.part.text;
  if (event.type === 'text' && typeof event.text === 'string') return event.text;
  if (event.type === 'result' && typeof event.result === 'string') return event.result;
  for (const key of ['response', 'message', 'content', 'output', 'text', 'result']) {
    if (typeof event[key] === 'string') return event[key];
  }
  return undefined;
}

export function parseEventStructuredOutput(stdout, label) {
  const trimmed = stdout.trim();
  const values = [];
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.task_id) return parsed;
      const directText = textFromEvent(parsed);
      if (directText) values.push(directText);
    } else if (Array.isArray(parsed)) {
      for (const event of parsed) {
        const value = textFromEvent(event);
        if (value) values.push(value);
      }
    }
  } catch {
    for (const line of trimmed.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const value = textFromEvent(JSON.parse(line));
        if (value) values.push(value);
      } catch {
        // Provider diagnostics are ignored; only machine-readable events are candidates.
      }
    }
  }
  for (const value of values.reverse()) {
    try {
      return parseJsonObject(value, label);
    } catch {
      // Continue to an earlier final-text candidate.
    }
  }
  return parseJsonObject(trimmed, label);
}

export function versionFrom(output) {
  return output.match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/)?.[0];
}

export function currentHost(env, names) {
  const explicit = env.NONO_SKILLS_HOST?.toLowerCase();
  return names.some((name) => explicit === name || env[name] !== undefined);
}

export function assertAdapter(adapter) {
  for (const key of ['name', 'displayName', 'command']) {
    if (typeof adapter[key] !== 'string' || adapter[key].trim() === '') {
      throw new Error(`Invalid external-agent adapter ${adapter.name ?? '<unknown>'}: ${key}`);
    }
  }
  if (!Array.isArray(adapter.helpProbes) || !Array.isArray(adapter.requiredFlags)) {
    throw new Error(`Invalid external-agent adapter ${adapter.name}: probes`);
  }
  if (typeof adapter.schemaEnforced !== 'boolean') {
    throw new Error(`Invalid external-agent adapter ${adapter.name}: schemaEnforced`);
  }
  if (
    adapter.limits === null
    || typeof adapter.limits !== 'object'
    || Array.isArray(adapter.limits)
  ) {
    throw new Error(`Invalid external-agent adapter ${adapter.name}: limits`);
  }
  for (const [name, flag] of Object.entries(adapter.limits)) {
    if (
      !['maxBudgetUsd', 'maxTurns', 'maxToolCalls'].includes(name)
      || typeof flag !== 'string'
      || flag.trim() === ''
    ) {
      throw new Error(`Invalid external-agent adapter ${adapter.name}: limit ${name}`);
    }
  }
  for (const mode of ['review', 'implement']) {
    if (typeof adapter.roles?.[mode]?.supported !== 'boolean') {
      throw new Error(`Invalid external-agent adapter ${adapter.name}: ${mode} role`);
    }
  }
  return adapter;
}
