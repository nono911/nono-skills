#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const evidenceSchemaVersion = 2;
export const runSchemaVersion = 2;
const readableSchemaVersions = new Set([1, runSchemaVersion]);
export const immutableBudgets = Object.freeze({
  review_batches: Object.freeze({ limit: 5 }),
  fix_cycles: Object.freeze({ limit: 4 }),
  no_verdict_retries: Object.freeze({ limit: 1 }),
});

const runKinds = new Set(['delivery', 'bugfix']);
const terminalStatuses = new Set(['COMPLETE', 'BUDGET_EXHAUSTED']);
const runStatuses = new Set([
  'IMPLEMENTING',
  'PREPARING',
  'VERIFYING',
  'READY_FOR_REVIEW',
  'REVIEWING',
  'REVIEW_RETRY',
  'TRIAGING_FINDINGS',
  'AWAITING_FIX',
  'FINAL_VERIFYING',
  'READY_TO_COMPLETE',
  'BLOCKED',
  ...terminalStatuses,
]);
const findingSeverities = new Set(['critical', 'high', 'medium', 'low']);
const triageDispositions = new Set([
  'actionable',
  'non-blocking',
  'out-of-scope',
  'duplicate',
  'stale',
  'not-reproducible',
  'accepted-risk',
  'unvalidated',
]);
const residualDispositions = new Set([
  'non-blocking',
  'out-of-scope',
  'not-reproducible',
  'accepted-risk',
  'unvalidated',
]);
const findingEvidenceKinds = new Set([
  'failing-check',
  'reproduction',
  'trace',
  'static-path',
  'observation',
]);
const findingEvidenceStatuses = new Set(['supported', 'insufficient']);
const dispositionReasonCodes = Object.freeze({
  actionable: new Set(['IN_SCOPE_VALIDATED']),
  'non-blocking': new Set(['LOW_SEVERITY']),
  'out-of-scope': new Set([
    'PREEXISTING_UNRELATED',
    'DIFFERENT_SUBSYSTEM',
    'OUTSIDE_APPROVED_SCOPE',
  ]),
  duplicate: new Set(['SAME_ROOT_CAUSE']),
  stale: new Set(['SUPERSEDED_BY_FIX']),
  'not-reproducible': new Set([
    'ENV_DEPENDENT',
    'INSUFFICIENT_REPRO_STEPS',
    'CONTRADICTED_BY_CHECK',
  ]),
  'accepted-risk': new Set(['OWNER_ACCEPTED']),
  unvalidated: new Set(['INSUFFICIENT_EVIDENCE', 'UNVERIFIED_OBSERVATION']),
});
const fixDispositions = new Set(['fixed', 'blocked']);
const specialistByRisk = Object.freeze({
  authentication: 'security-review',
  authorization: 'security-review',
  crypto: 'security-review',
  permissions: 'security-review',
  secrets: 'security-review',
  security: 'security-review',
  database: 'migration',
  data: 'migration',
  migration: 'migration',
  schema: 'migration',
  architecture: 'architecture-review',
  concurrency: 'architecture-review',
  performance: 'architecture-review',
  scalability: 'architecture-review',
  browser: 'acceptance-verify',
  ui: 'acceptance-verify',
  'user-journey': 'acceptance-verify',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function stringList(value, label, { allowEmpty = true } = {}) {
  if (
    !Array.isArray(value)
    || (!allowEmpty && value.length === 0)
    || value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    throw new Error(`${label} must be ${allowEmpty ? 'a' : 'a non-empty'} string list`);
  }
  const normalized = value.map((item) => item.trim());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
  return normalized;
}

function safeId(value, label) {
  const normalized = nonEmptyString(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
    throw new Error(`${label} contains unsupported characters`);
  }
  return normalized;
}

function clone(value) {
  return structuredClone(value);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

function digest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex')}`;
}

function now(clock) {
  const value = clock();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function defaultClock() {
  return new Date();
}

function defaultRunCommand(command, args, { cwd, env = process.env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ code: 127, stdout, stderr: error.message }));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function gitOutput(worktree, args, execute = defaultRunCommand) {
  const result = await execute('git', ['-C', worktree, ...args], { cwd: worktree });
  if (result.code !== 0) {
    throw new Error(`Git inspection failed: ${result.stderr.trim() || `exit ${result.code}`}`);
  }
  return result.stdout.trim();
}

export async function resolveRepository(worktree, { runCommand = defaultRunCommand } = {}) {
  const canonicalInput = await realpath(path.resolve(nonEmptyString(worktree, 'worktree')));
  const repositoryRoot = await realpath(await gitOutput(
    canonicalInput,
    ['rev-parse', '--show-toplevel'],
    runCommand,
  ));
  if (repositoryRoot !== canonicalInput) {
    throw new Error('worktree must be the canonical Git worktree root');
  }
  let commonDirectory = await gitOutput(
    repositoryRoot,
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    runCommand,
  );
  if (!path.isAbsolute(commonDirectory)) {
    commonDirectory = path.resolve(repositoryRoot, commonDirectory);
  }
  commonDirectory = await realpath(commonDirectory);
  const headSha = await gitOutput(repositoryRoot, ['rev-parse', 'HEAD'], runCommand);
  return {
    worktree: repositoryRoot,
    commonDirectory,
    headSha,
    storeRoot: path.join(commonDirectory, 'nono-skills'),
  };
}

async function writeJsonAtomic(destination, value) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, destination);
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} is missing`);
    if (error instanceof SyntaxError) throw new Error(`${label} contains malformed JSON`);
    throw error;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withLock(lockPath, action) {
  await mkdir(path.dirname(lockPath), { recursive: true });
  let handle;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      handle = await open(lockPath, 'wx', 0o600);
      await handle.writeFile(`${process.pid}\n`);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const details = await stat(lockPath).catch(() => undefined);
      if (details && Date.now() - details.mtimeMs > 30_000) {
        await rm(lockPath, { force: true });
        continue;
      }
      if (attempt === 24) throw new Error('Loop controller is busy; retry this operation once');
      await wait(20);
    }
  }
  try {
    return await action();
  } finally {
    await handle?.close();
    await rm(lockPath, { force: true });
  }
}

function runDirectory(storeRoot, runId) {
  return path.join(storeRoot, 'runs', safeId(runId, 'run_id'));
}

function eventFileName(sequence, eventType) {
  return `${String(sequence).padStart(6, '0')}-${eventType.replaceAll('.', '-')}.json`;
}

function eventForHash(event) {
  const copy = clone(event);
  delete copy.event_hash;
  return copy;
}

async function readEvents(runRoot) {
  let entries;
  try {
    entries = await readdir(path.join(runRoot, 'events'), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const names = entries
    .filter((entry) => entry.isFile() && /^\d{6}-.+\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const events = [];
  let previousHash = null;
  for (let index = 0; index < names.length; index += 1) {
    const event = await readJson(path.join(runRoot, 'events', names[index]), `run event ${names[index]}`);
    if (event.sequence !== index + 1) throw new Error('Run evidence sequence is corrupted');
    if (event.previous_event_hash !== previousHash) throw new Error('Run evidence hash chain is corrupted');
    if (event.event_hash !== digest(eventForHash(event))) {
      throw new Error('Run evidence digest is corrupted');
    }
    previousHash = event.event_hash;
    events.push(event);
  }
  return events;
}

async function loadRunFromRoot(runRoot) {
  const manifest = await readJson(path.join(runRoot, 'manifest.json'), 'run manifest');
  if (!readableSchemaVersions.has(manifest.schema_version)) {
    throw new Error(`Unsupported run schema version: ${manifest.schema_version}`);
  }
  const storedSchemaVersion = manifest.schema_version;
  const manifestRunId = safeId(manifest.run_id, 'manifest run_id');
  if (manifestRunId !== path.basename(runRoot)) throw new Error('Run manifest run_id does not match its directory');
  if (!runKinds.has(manifest.kind)) throw new Error('Run manifest kind is invalid');
  nonEmptyString(manifest.worktree, 'manifest worktree');
  const events = await readEvents(runRoot);
  if (events.length === 0) throw new Error('Run has no evidence events');
  for (const event of events) {
    if (event.schema_version !== storedSchemaVersion) {
      throw new Error(`Unsupported event schema version: ${event.schema_version}`);
    }
    if (
      !isPlainObject(event.evidence)
      || event.evidence.schema_version !== storedSchemaVersion
      || event.evidence.event_type !== event.event_type
      || event.evidence.run_id !== manifestRunId
      || event.state_after?.run_id !== manifestRunId
    ) {
      throw new Error('Run event identity is corrupted');
    }
  }
  const latest = events.at(-1);
  const state = {
    ...latest.state_after,
    event_sequence: latest.sequence,
    last_event_hash: latest.event_hash,
  };
  if (state.schema_version !== storedSchemaVersion) throw new Error('Run state schema version is corrupted');
  if (state.kind !== manifest.kind || state.worktree !== manifest.worktree) {
    throw new Error('Run state identity is corrupted');
  }
  const manifestSupersedesRunId = manifest.supersedes_run_id === undefined
    ? null
    : manifest.supersedes_run_id;
  if (manifestSupersedesRunId !== null) {
    safeId(manifestSupersedesRunId, 'manifest supersedes_run_id');
    if (manifestSupersedesRunId === manifestRunId) {
      throw new Error('Run manifest cannot supersede itself');
    }
  }
  if ((state.supersedes_run_id ?? null) !== manifestSupersedesRunId) {
    throw new Error('Run supersession identity is corrupted');
  }
  if (!runStatuses.has(state.status)) throw new Error('Run state status is corrupted');
  assertImmutableBudgets(state);
  return {
    manifest,
    state,
    events,
    runRoot,
    readOnly: storedSchemaVersion !== runSchemaVersion,
  };
}

async function appendEventUnlocked(runRoot, currentState, evidence, nextState, { clock, uuid }) {
  const sequence = currentState.event_sequence + 1;
  const projected = clone(nextState);
  delete projected.last_event_hash;
  projected.event_sequence = sequence;
  const event = {
    schema_version: evidenceSchemaVersion,
    event_id: uuid(),
    sequence,
    previous_event_hash: currentState.last_event_hash,
    event_type: evidence.event_type,
    occurred_at: now(clock),
    evidence,
    state_after: projected,
  };
  event.event_hash = digest(eventForHash(event));
  await writeJsonAtomic(
    path.join(runRoot, 'events', eventFileName(sequence, evidence.event_type)),
    event,
  );
  const storedState = { ...projected, last_event_hash: event.event_hash };
  await writeJsonAtomic(path.join(runRoot, 'state.json'), storedState);
  return { state: storedState, event };
}

function budgets() {
  return Object.fromEntries(Object.entries(immutableBudgets).map(([name, value]) => [
    name,
    { limit: value.limit, used: 0 },
  ]));
}

function assertImmutableBudgets(state) {
  for (const [name, immutable] of Object.entries(immutableBudgets)) {
    if (
      !isPlainObject(state.budgets?.[name])
      || state.budgets[name].limit !== immutable.limit
      || !Number.isInteger(state.budgets[name].used)
      || state.budgets[name].used < 0
      || state.budgets[name].used > immutable.limit
    ) {
      throw new Error(`Run budget ${name} is corrupted`);
    }
  }
}

function actor(value, label = 'evidence actor') {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  return {
    provider: nonEmptyString(value.provider, `${label} provider`),
    role: nonEmptyString(value.role, `${label} role`),
    capabilities: stringList(value.capabilities ?? [], `${label} capabilities`),
  };
}

function optionalNonEmptyString(value, label) {
  if (value === undefined) return undefined;
  return nonEmptyString(value, label);
}

function findingEvidence(value, label, { expectedHead } = {}) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const kind = nonEmptyString(value.kind, `${label} kind`);
  if (!findingEvidenceKinds.has(kind)) throw new Error(`${label} has invalid kind`);
  const headSha = nonEmptyString(value.head_sha, `${label} head_sha`);
  if (expectedHead && headSha !== expectedHead) {
    throw new Error(`${label} head_sha does not match the controlled snapshot`);
  }
  const result = {
    kind,
    head_sha: headSha,
    summary: nonEmptyString(value.summary, `${label} summary`),
  };
  const reference = optionalNonEmptyString(value.reference, `${label} reference`);
  if (reference) result.reference = reference;
  if (value.digest !== undefined) {
    const evidenceDigest = nonEmptyString(value.digest, `${label} digest`);
    if (!/^sha256:[a-f0-9]{64}$/.test(evidenceDigest)) {
      throw new Error(`${label} digest must be a sha256 digest`);
    }
    result.digest = evidenceDigest;
  }
  return result;
}

function finding(value, label, { expectedHead } = {}) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const severity = nonEmptyString(value.severity, `${label} severity`);
  if (!findingSeverities.has(severity)) throw new Error(`${label} has invalid severity`);
  const evidenceStatus = nonEmptyString(value.evidence_status, `${label} evidence_status`);
  if (!findingEvidenceStatuses.has(evidenceStatus)) {
    throw new Error(`${label} has invalid evidence_status`);
  }
  return {
    id: safeId(value.id, `${label} id`),
    severity,
    category: nonEmptyString(value.category ?? 'general', `${label} category`),
    location: nonEmptyString(value.location, `${label} location`),
    evidence_status: evidenceStatus,
    evidence: findingEvidence(value.evidence, `${label} evidence`, { expectedHead }),
    impact: nonEmptyString(value.impact, `${label} impact`),
    remediation: nonEmptyString(value.remediation, `${label} remediation`),
  };
}

function normalizedFindings(value, options = {}) {
  if (!Array.isArray(value)) throw new Error('review findings must be an array');
  const findings = value.map((item, index) => finding(item, `review finding ${index + 1}`, options));
  const ids = findings.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('review findings contain duplicate IDs');
  return findings;
}

function normalizeTriageAttempt(value, label, expectedHead) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const atHead = nonEmptyString(value.at_head, `${label} at_head`);
  if (atHead !== expectedHead) throw new Error(`${label} at_head must match the controlled snapshot`);
  const result = nonEmptyString(value.result, `${label} result`);
  if (!['passed', 'inconclusive', 'blocked'].includes(result)) {
    throw new Error(`${label} result must be passed, inconclusive, or blocked`);
  }
  return {
    check: nonEmptyString(value.check, `${label} check`),
    at_head: atHead,
    result,
  };
}

function normalizeTriageDisposition(value, index, state, knownFindingIds) {
  const label = `finding disposition ${index + 1}`;
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
  const disposition = nonEmptyString(value.disposition, label);
  if (!triageDispositions.has(disposition)) throw new Error(`${label} is invalid`);
  const reasonCode = nonEmptyString(value.reason_code, `${label} reason_code`);
  if (!dispositionReasonCodes[disposition].has(reasonCode)) {
    throw new Error(`${label} reason_code is invalid for ${disposition}`);
  }
  const normalized = {
    finding_id: safeId(value.finding_id, `${label} ID`),
    disposition,
    reason_code: reasonCode,
    summary: nonEmptyString(value.summary, `${label} summary`),
  };

  if (disposition === 'out-of-scope') {
    const causalRelation = nonEmptyString(value.causal_relation, `${label} causal_relation`);
    if (!['preexisting', 'unrelated', 'outside-authority'].includes(causalRelation)) {
      throw new Error(`${label} causal_relation is invalid`);
    }
    const expectedRelation = {
      PREEXISTING_UNRELATED: 'preexisting',
      DIFFERENT_SUBSYSTEM: 'unrelated',
      OUTSIDE_APPROVED_SCOPE: 'outside-authority',
    }[reasonCode];
    if (causalRelation !== expectedRelation) {
      throw new Error(`${label} causal_relation contradicts reason_code`);
    }
    normalized.causal_relation = causalRelation;
    normalized.scope_ref = nonEmptyString(value.scope_ref, `${label} scope_ref`);
  }
  if (disposition === 'not-reproducible') {
    if (!Array.isArray(value.attempted) || value.attempted.length === 0) {
      throw new Error(`${label} not-reproducible requires at least one attempted check`);
    }
    normalized.attempted = value.attempted.map((item, attemptIndex) => normalizeTriageAttempt(
      item,
      `${label} attempted ${attemptIndex + 1}`,
      state.current_head,
    ));
    if (
      reasonCode === 'CONTRADICTED_BY_CHECK'
      && !normalized.attempted.some((item) => item.result === 'passed')
    ) {
      throw new Error(`${label} CONTRADICTED_BY_CHECK requires a passing counter-check`);
    }
  }
  if (disposition === 'accepted-risk') {
    if (!isPlainObject(value.accepted_by)) throw new Error(`${label} accepted_by must be an object`);
    if (value.accepted_by.type !== 'human') {
      throw new Error(`${label} accepted_by type must be human`);
    }
    normalized.accepted_by = {
      type: 'human',
      identity: nonEmptyString(value.accepted_by.identity, `${label} accepted_by identity`),
      approval_ref: nonEmptyString(value.accepted_by.approval_ref, `${label} accepted_by approval_ref`),
    };
  }
  if (disposition === 'duplicate') {
    const duplicateOf = safeId(value.duplicate_of, `${label} duplicate_of`);
    if (duplicateOf === normalized.finding_id || !knownFindingIds.has(duplicateOf)) {
      throw new Error(`${label} duplicate_of must reference another known finding`);
    }
    normalized.duplicate_of = duplicateOf;
  }
  if (disposition === 'stale') {
    normalized.superseded_by = nonEmptyString(value.superseded_by, `${label} superseded_by`);
  }
  return normalized;
}

function residualFinding(findingItem, disposition) {
  const details = { ...disposition };
  delete details.finding_id;
  delete details.disposition;
  delete details.reason_code;
  delete details.summary;
  return {
    ...findingItem,
    disposition: disposition.disposition,
    reason_code: disposition.reason_code,
    disposition_summary: disposition.summary,
    justification: details,
  };
}

function assertForbiddenPayloadKeys(value, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertForbiddenPayloadKeys(item, [...trail, String(index)]));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(prompt|conversation|source|source_code|diff|terminal_output|environment|env|secrets?|api_key|access_token)$/i.test(key)) {
      throw new Error(`Evidence must not contain ${[...trail, key].join('.')}`);
    }
    assertForbiddenPayloadKeys(nested, [...trail, key]);
  }
}

function normalizeEvidence(input, expectedType, state, { expectedHead, allowNewHead = false } = {}) {
  if (!isPlainObject(input)) throw new Error('Evidence envelope must be an object');
  assertForbiddenPayloadKeys(input);
  if (input.schema_version !== evidenceSchemaVersion) {
    throw new Error(`Evidence schema_version must be ${evidenceSchemaVersion}`);
  }
  if (input.event_type !== expectedType) {
    throw new Error(`Evidence event_type must be ${expectedType}`);
  }
  if (input.run_id !== state.run_id) throw new Error('Evidence run_id does not match the active run');
  if (!isPlainObject(input.snapshot)) throw new Error('Evidence snapshot must be an object');
  const baseSha = nonEmptyString(input.snapshot.base_sha, 'evidence snapshot base_sha');
  const headSha = nonEmptyString(input.snapshot.head_sha, 'evidence snapshot head_sha');
  if (baseSha !== state.base_sha) throw new Error('Evidence base_sha does not match the active run');
  if (!allowNewHead && headSha !== (expectedHead ?? state.current_head)) {
    throw new Error('Evidence head_sha does not match the controlled snapshot');
  }
  if (allowNewHead && headSha === (expectedHead ?? state.current_head)) {
    throw new Error('Evidence must identify a new committed HEAD');
  }
  const acceptanceIds = stringList(input.acceptance_ids ?? [], 'evidence acceptance_ids');
  for (const id of acceptanceIds) {
    if (!state.acceptance_ids.includes(id)) throw new Error(`Evidence references unknown acceptance ID: ${id}`);
  }
  if (!isPlainObject(input.verification)) throw new Error('Evidence verification must be an object');
  const normalized = {
    schema_version: evidenceSchemaVersion,
    event_type: expectedType,
    run_id: state.run_id,
    actor: actor(input.actor),
    snapshot: { base_sha: baseSha, head_sha: headSha },
    acceptance_ids: acceptanceIds,
    outcome: nonEmptyString(input.outcome, 'evidence outcome'),
    verification: {
      performed: stringList(input.verification.performed ?? [], 'verification performed'),
      not_run: stringList(input.verification.not_run ?? [], 'verification not_run'),
    },
    limitations: stringList(input.limitations ?? [], 'evidence limitations'),
  };
  return { normalized, source: input };
}

function assertStatus(state, expected, action) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(state.status)) {
    throw new Error(`${action} requires ${allowed.join(' or ')}, current status is ${state.status}`);
  }
}

function assertRepositoryHead(repository, expected, action) {
  if (repository.headSha !== expected) {
    throw new Error(`${action} HEAD does not match the controlled worktree snapshot`);
  }
}

function assertControllable(state) {
  assertImmutableBudgets(state);
  if (terminalStatuses.has(state.status)) throw new Error(`Run is terminal: ${state.status}`);
}

function stateFindingSummary(findings) {
  return findings.map(({ id, severity, category }) => ({ id, severity, category }));
}

function capabilityPlan(riskSignals) {
  const specialists = [...new Set(riskSignals.map((signal) => specialistByRisk[signal]).filter(Boolean))];
  return {
    required_agent_capabilities: ['headless', 'structured-output', 'no-delegation'],
    recommended_specialists: specialists,
    reasons: specialists.map((specialist) => ({
      specialist,
      risk_signals: riskSignals.filter((signal) => specialistByRisk[signal] === specialist),
    })),
  };
}

export function planCapabilities(riskSignals = []) {
  return capabilityPlan(stringList(riskSignals, 'risk_signals'));
}

async function runStates(repository) {
  let entries;
  try {
    entries = await readdir(path.join(repository.storeRoot, 'runs'), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const values = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    values.push(await loadRunFromRoot(path.join(repository.storeRoot, 'runs', entry.name)));
  }
  return values;
}

export async function startRun({
  worktree,
  kind,
  acceptanceIds = [],
  riskSignals = [],
  parentRunId,
  supersedeRunId,
  confirmSupersede = false,
  clock = defaultClock,
  uuid = randomUUID,
  runCommand = defaultRunCommand,
} = {}) {
  if (!runKinds.has(kind)) throw new Error('kind must be delivery or bugfix');
  const accepted = stringList(acceptanceIds, 'acceptance_ids', { allowEmpty: false });
  const risks = stringList(riskSignals, 'risk_signals');
  const normalizedSupersedeRunId = supersedeRunId === undefined
    ? null
    : safeId(supersedeRunId, 'supersede_run_id');
  if (normalizedSupersedeRunId !== null && confirmSupersede !== true) {
    throw new Error('Legacy run supersession requires explicit confirmation');
  }
  const repository = await resolveRepository(worktree, { runCommand });
  return withLock(path.join(repository.storeRoot, 'controller.lock'), async () => {
    const runs = await runStates(repository);
    const successors = normalizedSupersedeRunId
      ? runs.filter(({ manifest }) => manifest.supersedes_run_id === normalizedSupersedeRunId)
      : [];
    if (successors.length > 1) throw new Error('Legacy run has multiple successors; inspect run evidence');
    if (successors.length === 1) {
      return {
        created: false,
        resumed: !terminalStatuses.has(successors[0].state.status),
        superseded: true,
        superseded_run_id: normalizedSupersedeRunId,
        state: successors[0].state,
        capability_plan: capabilityPlan(successors[0].state.risk_signals),
      };
    }
    const supersededIds = new Set(runs
      .map(({ manifest }) => manifest.supersedes_run_id)
      .filter(Boolean));
    const existing = runs.filter(({ state }) => (
      state.worktree === repository.worktree && !terminalStatuses.has(state.status)
      && !supersededIds.has(state.run_id)
    ));
    if (existing.length > 1) throw new Error('Multiple active runs match this worktree; select a run_id');
    if (normalizedSupersedeRunId !== null) {
      const target = runs.find(({ state }) => state.run_id === normalizedSupersedeRunId);
      if (!target) throw new Error(`Legacy run not found: ${normalizedSupersedeRunId}`);
      if (!target.readOnly || target.manifest.schema_version !== 1) {
        throw new Error('Only a read-only schema-version-1 run can be superseded');
      }
      if (terminalStatuses.has(target.state.status)) {
        throw new Error('Terminal legacy runs do not need supersession');
      }
      if (target.state.worktree !== repository.worktree) {
        throw new Error('Legacy run does not belong to this worktree');
      }
      if (existing.length !== 1 || existing[0].state.run_id !== target.state.run_id) {
        throw new Error('Another active run already owns this worktree');
      }
    }
    if (existing.length === 1) {
      if (existing[0].readOnly && !normalizedSupersedeRunId) {
        throw new Error(
          `Active run ${existing[0].state.run_id} uses read-only schema version ${existing[0].manifest.schema_version}; obtain explicit approval, then supersede it with a linked v2 run`,
        );
      }
      if (!normalizedSupersedeRunId && existing[0].state.kind !== kind) {
        throw new Error(`Active ${existing[0].state.kind} run already owns this worktree`);
      }
      if (!normalizedSupersedeRunId) {
        return { created: false, resumed: true, state: existing[0].state, capability_plan: capabilityPlan(existing[0].state.risk_signals) };
      }
    }
    const runId = uuid();
    const runRoot = runDirectory(repository.storeRoot, runId);
    await mkdir(path.join(runRoot, 'events'), { recursive: true });
    const createdAt = now(clock);
    const manifest = {
      schema_version: runSchemaVersion,
      run_id: runId,
      kind,
      worktree: repository.worktree,
      git_common_directory: repository.commonDirectory,
      parent_run_id: parentRunId ? safeId(parentRunId, 'parent_run_id') : null,
      supersedes_run_id: normalizedSupersedeRunId,
      created_at: createdAt,
    };
    await writeJsonAtomic(path.join(runRoot, 'manifest.json'), manifest);
    const initialState = {
      schema_version: runSchemaVersion,
      run_id: runId,
      kind,
      status: 'IMPLEMENTING',
      parent_run_id: manifest.parent_run_id,
      supersedes_run_id: manifest.supersedes_run_id,
      worktree: repository.worktree,
      base_sha: repository.headSha,
      current_head: repository.headSha,
      acceptance_ids: accepted,
      risk_signals: risks,
      budgets: budgets(),
      active_review: null,
      retry_review: null,
      reviewed_heads: [],
      pending_findings: [],
      open_findings: [],
      residual_findings: [],
      completion_kind: null,
      blocked_from: null,
      block_reason: null,
      created_at: createdAt,
      updated_at: createdAt,
      event_sequence: 0,
      last_event_hash: null,
    };
    const startedEvidence = {
      schema_version: evidenceSchemaVersion,
      event_type: 'run.started',
      run_id: runId,
      actor: { provider: 'host', role: 'orchestrator', capabilities: [] },
      snapshot: { base_sha: repository.headSha, head_sha: repository.headSha },
      acceptance_ids: accepted,
      outcome: 'started',
      verification: { performed: [], not_run: [] },
      limitations: [],
      risk_signals: risks,
      supersedes_run_id: manifest.supersedes_run_id,
      immutable_budgets: budgets(),
    };
    const appended = await appendEventUnlocked(
      runRoot,
      initialState,
      startedEvidence,
      initialState,
      { clock, uuid },
    );
    return {
      created: true,
      resumed: false,
      superseded: normalizedSupersedeRunId !== null,
      superseded_run_id: normalizedSupersedeRunId,
      state: appended.state,
      capability_plan: capabilityPlan(risks),
    };
  });
}

export async function supersedeLegacyRun({
  worktree,
  runId,
  confirm = false,
  clock = defaultClock,
  uuid = randomUUID,
  runCommand = defaultRunCommand,
} = {}) {
  if (confirm !== true) throw new Error('Legacy run supersession requires explicit confirmation');
  const repository = await resolveRepository(worktree, { runCommand });
  const legacy = await loadRunFromRoot(runDirectory(repository.storeRoot, runId));
  if (legacy.manifest.worktree !== repository.worktree) {
    throw new Error('Legacy run does not belong to this worktree');
  }
  return startRun({
    worktree: repository.worktree,
    kind: legacy.state.kind,
    acceptanceIds: legacy.state.acceptance_ids,
    riskSignals: legacy.state.risk_signals,
    supersedeRunId: legacy.state.run_id,
    confirmSupersede: true,
    clock,
    uuid,
    runCommand,
  });
}

export async function loadRun({ worktree, runId, runCommand = defaultRunCommand } = {}) {
  const repository = await resolveRepository(worktree, { runCommand });
  const loaded = await loadRunFromRoot(runDirectory(repository.storeRoot, runId));
  if (loaded.manifest.worktree !== repository.worktree) {
    throw new Error('Run does not belong to this worktree');
  }
  assertImmutableBudgets(loaded.state);
  return loaded;
}

async function mutateRun(options, action) {
  const repository = await resolveRepository(options.worktree, { runCommand: options.runCommand });
  const runRoot = runDirectory(repository.storeRoot, options.runId);
  return withLock(path.join(runRoot, 'transition.lock'), async () => {
    const loaded = await loadRunFromRoot(runRoot);
    if (loaded.manifest.worktree !== repository.worktree) throw new Error('Run does not belong to this worktree');
    if (loaded.readOnly) {
      throw new Error(
        `Run schema version ${loaded.manifest.schema_version} is read-only; status and list remain available, but resume and mutation are unsupported`,
      );
    }
    assertControllable(loaded.state);
    const result = await action({ ...loaded, repository });
    const appended = await appendEventUnlocked(
      runRoot,
      loaded.state,
      result.evidence,
      { ...result.state, updated_at: now(options.clock ?? defaultClock) },
      { clock: options.clock ?? defaultClock, uuid: options.uuid ?? randomUUID },
    );
    if (terminalStatuses.has(appended.state.status)) {
      await writeRunSummary(runRoot, appended.state, [...loaded.events, appended.event]);
    }
    return { ...result.output, state: appended.state, event: appended.event };
  });
}

export async function recordMilestone(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, ['IMPLEMENTING', 'PREPARING'], 'milestone');
    if (!['diagnosis.completed', 'implementation.completed'].includes(options.evidence?.event_type)) {
      throw new Error('milestone evidence must be diagnosis.completed or implementation.completed');
    }
    const type = options.evidence.event_type;
    const allowNewHead = type === 'implementation.completed';
    const { normalized, source } = normalizeEvidence(options.evidence, type, state, { allowNewHead });
    if (normalized.outcome !== 'completed') throw new Error(`${type} outcome must be completed`);
    if (type === 'diagnosis.completed') {
      assertRepositoryHead(repository, state.current_head, 'Diagnosis evidence');
      normalized.causal_chain = nonEmptyString(source.causal_chain, 'diagnosis causal_chain');
      return { state: { ...state, status: 'IMPLEMENTING' }, evidence: normalized, output: {} };
    }
    normalized.files = stringList(source.files, 'implementation files', { allowEmpty: false });
    assertRepositoryHead(repository, normalized.snapshot.head_sha, 'Implementation evidence');
    return {
      state: { ...state, current_head: normalized.snapshot.head_sha, status: 'VERIFYING' },
      evidence: normalized,
      output: {},
    };
  });
}

export async function recordVerification(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, ['VERIFYING', 'FINAL_VERIFYING'], 'verification');
    const { normalized, source } = normalizeEvidence(options.evidence, 'verification.completed', state);
    assertRepositoryHead(repository, state.current_head, 'Verification evidence');
    if (!['passed', 'failed', 'blocked'].includes(normalized.outcome)) {
      throw new Error('verification outcome must be passed, failed, or blocked');
    }
    if (normalized.outcome === 'passed' && normalized.verification.performed.length === 0) {
      throw new Error('passed verification requires at least one performed check');
    }
    if (normalized.outcome === 'blocked') {
      if (normalized.limitations.length === 0) throw new Error('blocked verification requires limitations');
      return {
        state: {
          ...state,
          status: 'BLOCKED',
          blocked_from: state.status,
          block_reason: normalized.limitations.join('; '),
        },
        evidence: normalized,
        output: {},
      };
    }
    if (normalized.outcome === 'failed') {
      const verificationFinding = finding(source.finding, 'verification finding', {
        expectedHead: state.current_head,
      });
      normalized.finding = verificationFinding;
      if (state.status === 'VERIFYING') {
        return {
          state: {
            ...state,
            status: 'IMPLEMENTING',
            pending_findings: [],
            open_findings: [],
          },
          evidence: normalized,
          output: { remediation_required: true },
        };
      }
      const noFixBudget = state.budgets.fix_cycles.used >= state.budgets.fix_cycles.limit;
      const noReviewBudget = state.budgets.review_batches.used >= state.budgets.review_batches.limit;
      if (noFixBudget || noReviewBudget) {
        return {
          state: {
            ...state,
            status: 'BUDGET_EXHAUSTED',
            pending_findings: [],
            open_findings: [verificationFinding],
            recovery: {
              parent_run_id: state.run_id,
              reviewed_head: state.current_head,
              remaining_findings: stateFindingSummary([verificationFinding]),
              allowed_next_actions: ['narrow-successor-run', 'accept-risk', 'stop'],
              exhausted_budgets: [
                ...(noFixBudget ? ['fix_cycles'] : []),
                ...(noReviewBudget ? ['review_batches'] : []),
              ],
            },
          },
          evidence: {
            ...normalized,
            controller_transition: 'BUDGET_EXHAUSTED',
            recovery_required: true,
          },
          output: { recovery_required: true },
        };
      }
      return {
        state: {
          ...state,
          status: 'AWAITING_FIX',
          pending_findings: [],
          open_findings: [verificationFinding],
        },
        evidence: normalized,
        output: { remediation_required: true },
      };
    }
    return {
      state: {
        ...state,
        status: state.status === 'FINAL_VERIFYING' ? 'READY_TO_COMPLETE' : 'READY_FOR_REVIEW',
        blocked_from: null,
        block_reason: null,
      },
      evidence: normalized,
      output: {},
    };
  });
}

function normalizedReviewers(reviewers) {
  if (!Array.isArray(reviewers) || reviewers.length === 0 || reviewers.length > 4) {
    throw new Error('reviewers must contain one to four reviewer roles');
  }
  return stringList(reviewers, 'reviewers', { allowEmpty: false });
}

export async function beginReview(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, ['READY_FOR_REVIEW', 'REVIEW_RETRY'], 'review begin');
    const headSha = nonEmptyString(options.headSha, 'head_sha');
    if (headSha !== state.current_head || headSha !== repository.headSha) {
      throw new Error('Review HEAD must match the controlled worktree snapshot');
    }
    const reviewers = normalizedReviewers(options.reviewers ?? ['general']);
    const nextBudgets = clone(state.budgets);
    let batch;
    let attempt;
    if (state.status === 'REVIEW_RETRY') {
      if (nextBudgets.no_verdict_retries.used >= nextBudgets.no_verdict_retries.limit) {
        throw new Error('No-verdict retry budget is exhausted');
      }
      if (!state.retry_review || state.retry_review.head_sha !== headSha) {
        throw new Error('No matching no-verdict review is eligible for retry');
      }
      nextBudgets.no_verdict_retries.used += 1;
      batch = state.retry_review.batch;
      attempt = state.retry_review.attempt + 1;
    } else {
      if (nextBudgets.review_batches.used >= nextBudgets.review_batches.limit) {
        throw new Error('Review batch budget is exhausted');
      }
      if (state.reviewed_heads.some((reviewed) => reviewed.head_sha === headSha)) {
        throw new Error('This HEAD already has a review verdict');
      }
      nextBudgets.review_batches.used += 1;
      batch = nextBudgets.review_batches.used;
      attempt = 1;
    }
    const lease = {
      run_id: state.run_id,
      lease_id: (options.uuid ?? randomUUID)(),
      batch,
      attempt,
      head_sha: headSha,
      reviewers,
    };
    const evidence = {
      schema_version: evidenceSchemaVersion,
      event_type: 'review.started',
      run_id: state.run_id,
      actor: actor(options.actor ?? { provider: 'host', role: 'orchestrator', capabilities: [] }),
      snapshot: { base_sha: state.base_sha, head_sha: headSha },
      acceptance_ids: state.acceptance_ids,
      outcome: 'started',
      verification: { performed: [], not_run: [] },
      limitations: [],
      lease,
    };
    return {
      state: {
        ...state,
        status: 'REVIEWING',
        budgets: nextBudgets,
        active_review: lease,
        retry_review: null,
      },
      evidence,
      output: { lease },
    };
  });
}

export async function completeReview(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, 'REVIEWING', 'review completion');
    const leaseId = nonEmptyString(options.leaseId, 'lease_id');
    if (!state.active_review || state.active_review.lease_id !== leaseId) {
      throw new Error('Review lease is stale or does not belong to this run');
    }
    if (repository.headSha !== state.active_review.head_sha) {
      throw new Error('Controlled worktree changed during review');
    }
    const { normalized, source } = normalizeEvidence(options.evidence, 'review.completed', state, {
      expectedHead: state.active_review.head_sha,
    });
    if (source.lease_id !== leaseId) throw new Error('Evidence lease_id does not match the active review');
    if (!['clean', 'findings', 'no-verdict'].includes(normalized.outcome)) {
      throw new Error('review outcome must be clean, findings, or no-verdict');
    }
    const findings = normalizedFindings(source.findings ?? [], {
      expectedHead: state.active_review.head_sha,
    });
    if (normalized.outcome === 'clean' && findings.length !== 0) {
      throw new Error('clean review must not include findings');
    }
    if (normalized.outcome === 'findings' && findings.length === 0) {
      throw new Error('findings review must include findings');
    }
    if (normalized.outcome === 'no-verdict' && normalized.limitations.length === 0) {
      throw new Error('no-verdict review requires limitations');
    }
    normalized.lease_id = leaseId;
    normalized.findings = findings;
    const observation = {
      head_sha: state.active_review.head_sha,
      batch: state.active_review.batch,
      attempt: state.active_review.attempt,
      outcome: normalized.outcome,
      provider: normalized.actor.provider,
      capabilities: normalized.actor.capabilities,
      findings: stateFindingSummary(findings),
    };
    const reviewedHeads = [...state.reviewed_heads, observation];
    if (normalized.outcome === 'clean') {
      return {
        state: {
          ...state,
          status: 'FINAL_VERIFYING',
          active_review: null,
          reviewed_heads: reviewedHeads,
          pending_findings: [],
          open_findings: [],
        },
        evidence: normalized,
        output: {},
      };
    }
    if (normalized.outcome === 'findings') {
      return {
        state: {
          ...state,
          status: 'TRIAGING_FINDINGS',
          active_review: null,
          reviewed_heads: reviewedHeads,
          pending_findings: findings,
        },
        evidence: normalized,
        output: {},
      };
    }
    const retryAvailable = state.budgets.no_verdict_retries.used < state.budgets.no_verdict_retries.limit;
    return {
      state: {
        ...state,
        status: retryAvailable ? 'REVIEW_RETRY' : 'BLOCKED',
        active_review: null,
        reviewed_heads: reviewedHeads,
        retry_review: retryAvailable ? {
          batch: state.active_review.batch,
          attempt: state.active_review.attempt,
          head_sha: state.active_review.head_sha,
        } : null,
        blocked_from: retryAvailable ? null : 'REVIEW_RETRY',
        block_reason: retryAvailable ? null : 'No-verdict retry budget is exhausted',
      },
      evidence: normalized,
      output: {},
    };
  });
}

export async function triageFindings(options = {}) {
  return mutateRun(options, async ({ state, repository, events }) => {
    assertStatus(state, 'TRIAGING_FINDINGS', 'finding triage');
    const { normalized, source } = normalizeEvidence(options.evidence, 'findings.triaged', state);
    assertRepositoryHead(repository, state.current_head, 'Finding triage');
    if (normalized.outcome !== 'completed') throw new Error('finding triage outcome must be completed');
    if (!Array.isArray(source.dispositions)) throw new Error('finding triage dispositions must be an array');
    const pendingIds = state.pending_findings.map((item) => item.id);
    const knownFindingIds = new Set([
      ...pendingIds,
      ...events.flatMap((event) => (
        event.event_type === 'review.completed'
          ? (event.evidence.findings ?? []).map((item) => item.id)
          : []
      )),
    ]);
    const dispositions = source.dispositions.map((item, index) => normalizeTriageDisposition(
      item,
      index,
      state,
      knownFindingIds,
    ));
    const dispositionIds = dispositions.map((item) => item.finding_id);
    if (
      new Set(dispositionIds).size !== dispositionIds.length
      || dispositionIds.length !== pendingIds.length
      || pendingIds.some((id) => !dispositionIds.includes(id))
    ) {
      throw new Error('finding triage must disposition every pending finding exactly once');
    }
    const pendingById = new Map(state.pending_findings.map((item) => [item.id, item]));
    for (const item of dispositions) {
      const pending = pendingById.get(item.finding_id);
      if (item.disposition === 'actionable' && pending.severity === 'low') {
        throw new Error('low-severity findings cannot be actionable; use non-blocking or another evidence-backed disposition');
      }
      if (item.disposition === 'non-blocking' && pending.severity !== 'low') {
        throw new Error('non-blocking disposition requires a low-severity finding');
      }
      if (
        pending.evidence_status === 'insufficient'
        && !['unvalidated', 'duplicate', 'stale'].includes(item.disposition)
      ) {
        throw new Error('insufficient evidence must be dispositioned unvalidated, duplicate, or stale');
      }
      if (pending.evidence_status === 'supported' && item.disposition === 'unvalidated') {
        throw new Error('unvalidated disposition requires insufficient evidence');
      }
      if (
        item.disposition === 'not-reproducible'
        && pending.evidence.kind === 'failing-check'
        && item.reason_code !== 'CONTRADICTED_BY_CHECK'
      ) {
        throw new Error('a failing-check finding requires a passing counter-check before not-reproducible');
      }
    }
    normalized.dispositions = dispositions;
    const actionableIds = dispositions
      .filter((item) => item.disposition === 'actionable')
      .map((item) => item.finding_id);
    const actionable = state.pending_findings.filter((item) => actionableIds.includes(item.id));
    const newResiduals = dispositions
      .filter((item) => residualDispositions.has(item.disposition))
      .map((item) => residualFinding(pendingById.get(item.finding_id), item));
    const residualFindings = [...state.residual_findings, ...newResiduals];
    if (actionable.length === 0) {
      return {
        state: {
          ...state,
          status: 'FINAL_VERIFYING',
          pending_findings: [],
          open_findings: [],
          residual_findings: residualFindings,
        },
        evidence: normalized,
        output: {},
      };
    }
    if (state.budgets.review_batches.used === state.budgets.review_batches.limit) {
      return {
        state: {
          ...state,
          status: 'BUDGET_EXHAUSTED',
          pending_findings: [],
          open_findings: actionable,
          residual_findings: residualFindings,
          recovery: {
            parent_run_id: state.run_id,
            reviewed_head: state.current_head,
            remaining_findings: stateFindingSummary(actionable),
            allowed_next_actions: ['narrow-successor-run', 'accept-risk', 'stop'],
          },
        },
        evidence: {
          ...normalized,
          controller_transition: 'BUDGET_EXHAUSTED',
          recovery_required: true,
        },
        output: { recovery_required: true },
      };
    }
    return {
      state: {
        ...state,
        status: 'AWAITING_FIX',
        pending_findings: [],
        open_findings: actionable,
        residual_findings: residualFindings,
      },
      evidence: normalized,
      output: {},
    };
  });
}

export async function recordFix(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, 'AWAITING_FIX', 'fix completion');
    if (state.budgets.fix_cycles.used >= state.budgets.fix_cycles.limit) {
      throw new Error('Fix cycle budget is exhausted');
    }
    const { normalized, source } = normalizeEvidence(options.evidence, 'fix.completed', state, {
      allowNewHead: true,
    });
    if (!Array.isArray(source.dispositions)) throw new Error('fix dispositions must be an array');
    const dispositions = source.dispositions.map((item, index) => {
      if (!isPlainObject(item)) throw new Error(`fix disposition ${index + 1} must be an object`);
      const disposition = nonEmptyString(item.disposition, `fix disposition ${index + 1}`);
      if (!fixDispositions.has(disposition)) throw new Error(`fix disposition ${index + 1} is invalid`);
      return {
        finding_id: safeId(item.finding_id, `fix disposition ${index + 1} ID`),
        disposition,
        evidence: nonEmptyString(item.evidence, `fix disposition ${index + 1} evidence`),
      };
    });
    const openIds = state.open_findings.map((item) => item.id);
    const dispositionIds = dispositions.map((item) => item.finding_id);
    if (
      new Set(dispositionIds).size !== dispositionIds.length
      || dispositionIds.length !== openIds.length
      || openIds.some((id) => !dispositionIds.includes(id))
    ) {
      throw new Error('fix evidence must disposition every open finding exactly once');
    }
    normalized.dispositions = dispositions;
    normalized.files = stringList(source.files, 'fix files', { allowEmpty: false });
    assertRepositoryHead(repository, normalized.snapshot.head_sha, 'Fix evidence');
    const nextBudgets = clone(state.budgets);
    nextBudgets.fix_cycles.used += 1;
    const blocked = dispositions.some((item) => item.disposition === 'blocked');
    return {
      state: {
        ...state,
        status: blocked ? 'BLOCKED' : 'VERIFYING',
        current_head: normalized.snapshot.head_sha,
        budgets: nextBudgets,
        open_findings: blocked
          ? state.open_findings.filter((findingItem) => dispositions.some((item) => (
            item.finding_id === findingItem.id && item.disposition === 'blocked'
          )))
          : [],
        blocked_from: blocked ? 'AWAITING_FIX' : null,
        block_reason: blocked ? 'One or more actionable findings could not be fixed' : null,
      },
      evidence: normalized,
      output: {},
    };
  });
}

export async function completeRun(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, 'READY_TO_COMPLETE', 'run completion');
    const { normalized } = normalizeEvidence(options.evidence, 'run.completed', state);
    assertRepositoryHead(repository, state.current_head, 'Run completion');
    if (normalized.outcome !== 'completed') throw new Error('run completion outcome must be completed');
    const completionKind = state.residual_findings.length > 0
      ? 'clean_with_residuals'
      : 'clean';
    normalized.completion_kind = completionKind;
    return {
      state: { ...state, status: 'COMPLETE', completion_kind: completionKind },
      evidence: normalized,
      output: { completion_kind: completionKind },
    };
  });
}

export async function blockRun(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    const { normalized } = normalizeEvidence(options.evidence, 'run.blocked', state);
    assertRepositoryHead(repository, state.current_head, 'Run block');
    if (normalized.outcome !== 'blocked' || normalized.limitations.length === 0) {
      throw new Error('blocked evidence requires outcome blocked and at least one limitation');
    }
    return {
      state: {
        ...state,
        status: 'BLOCKED',
        blocked_from: state.status,
        block_reason: normalized.limitations.join('; '),
      },
      evidence: normalized,
      output: {},
    };
  });
}

export async function resumeBlockedRun(options = {}) {
  return mutateRun(options, async ({ state, repository }) => {
    assertStatus(state, 'BLOCKED', 'run resume');
    if (!state.blocked_from || terminalStatuses.has(state.blocked_from)) {
      throw new Error('Blocked run has no resumable prior state');
    }
    const { normalized } = normalizeEvidence(options.evidence, 'run.resumed', state);
    assertRepositoryHead(repository, state.current_head, 'Run resume');
    if (normalized.outcome !== 'resumed') throw new Error('run resume outcome must be resumed');
    return {
      state: {
        ...state,
        status: state.blocked_from,
        blocked_from: null,
        block_reason: null,
      },
      evidence: normalized,
      output: {},
    };
  });
}

function summarizeRun(state, events) {
  const categoryCounts = {};
  const reviewObservations = [];
  for (const event of events) {
    if (event.event_type !== 'review.completed') continue;
    for (const item of event.evidence.findings ?? []) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }
    reviewObservations.push({
      batch: event.state_after.reviewed_heads.at(-1)?.batch ?? null,
      outcome: event.evidence.outcome,
      provider: event.evidence.actor.provider,
      capabilities: event.evidence.actor.capabilities,
      finding_categories: [...new Set((event.evidence.findings ?? []).map((item) => item.category))],
    });
  }
  return {
    schema_version: 2,
    run_id: state.run_id,
    parent_run_id: state.parent_run_id,
    supersedes_run_id: state.supersedes_run_id ?? null,
    kind: state.kind,
    outcome: state.status,
    completion_kind: state.completion_kind ?? null,
    risk_signals: state.risk_signals,
    budgets_used: Object.fromEntries(Object.entries(state.budgets).map(([name, value]) => [name, value.used])),
    finding_categories: categoryCounts,
    review_observations: reviewObservations,
    remaining_findings: stateFindingSummary(state.open_findings),
    residual_findings: (state.residual_findings ?? []).map((item) => ({
      id: item.id,
      severity: item.severity,
      category: item.category,
      location: item.location,
      disposition: item.disposition,
      reason_code: item.reason_code,
    })),
    completed_at: state.updated_at,
  };
}

async function writeRunSummary(runRoot, state, events) {
  await writeJsonAtomic(path.join(runRoot, 'summary.json'), summarizeRun(state, events));
}

export async function listRuns({ worktree, runCommand = defaultRunCommand } = {}) {
  const repository = await resolveRepository(worktree, { runCommand });
  const values = await runStates(repository);
  const successorByRunId = new Map(values
    .filter(({ manifest }) => manifest.supersedes_run_id)
    .map(({ manifest, state }) => [manifest.supersedes_run_id, state.run_id]));
  return values
    .map(({ state }) => ({
      run_id: state.run_id,
      kind: state.kind,
      status: state.status,
      read_only: state.schema_version !== runSchemaVersion,
      supersedes_run_id: state.supersedes_run_id ?? null,
      superseded_by_run_id: successorByRunId.get(state.run_id) ?? null,
      completion_kind: state.completion_kind ?? null,
      current_head: state.current_head,
      review_batches: state.budgets.review_batches,
      updated_at: state.updated_at,
    }))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function showRun(options = {}) {
  const loaded = await loadRun(options);
  const repository = await resolveRepository(options.worktree, { runCommand: options.runCommand });
  const successor = (await runStates(repository))
    .find(({ manifest }) => manifest.supersedes_run_id === loaded.state.run_id);
  return {
    manifest: loaded.manifest,
    state: loaded.state,
    events: loaded.events,
    runRoot: loaded.runRoot,
    read_only: loaded.readOnly,
    superseded_by_run_id: successor?.state.run_id ?? null,
  };
}

export async function repositoryInsights({ worktree, runCommand = defaultRunCommand } = {}) {
  const repository = await resolveRepository(worktree, { runCommand });
  const values = await runStates(repository);
  const summaries = [];
  for (const value of values) {
    try {
      summaries.push(await readJson(path.join(value.runRoot, 'summary.json'), 'run summary'));
    } catch (error) {
      if (!error.message.endsWith('is missing')) throw error;
    }
  }
  const outcomes = {};
  const providerStats = {};
  const patterns = new Map();
  for (const summary of summaries) {
    outcomes[summary.outcome] = (outcomes[summary.outcome] ?? 0) + 1;
    for (const observation of summary.review_observations) {
      const stats = providerStats[observation.provider] ?? { samples: 0, clean: 0, findings: 0, no_verdict: 0 };
      stats.samples += 1;
      stats[observation.outcome.replace('-', '_')] = (stats[observation.outcome.replace('-', '_')] ?? 0) + 1;
      providerStats[observation.provider] = stats;
      if (observation.batch <= 1) continue;
      for (const risk of summary.risk_signals) {
        for (const category of observation.finding_categories) {
          const key = `${risk}\u0000${category}`;
          const pattern = patterns.get(key) ?? { risk_signal: risk, finding_category: category, supporting_runs: [] };
          if (!pattern.supporting_runs.includes(summary.run_id)) pattern.supporting_runs.push(summary.run_id);
          patterns.set(key, pattern);
        }
      }
    }
  }
  return {
    schema_version: 1,
    repository: repository.worktree,
    completed_runs: summaries.length,
    outcomes,
    provider_observations: providerStats,
    recommendations: [...patterns.values()].map((pattern) => ({
      ...pattern,
      recommendation: `Consider ${specialistByRisk[pattern.risk_signal] ?? `${pattern.finding_category} review`} in the first batch`,
      policy_effect: 'advisory-only',
    })),
  };
}

export async function purgeRepositoryEvidence({
  worktree,
  confirm = false,
  runCommand = defaultRunCommand,
} = {}) {
  if (confirm !== true) throw new Error('Evidence purge requires explicit confirmation');
  const repository = await resolveRepository(worktree, { runCommand });
  const runsRoot = path.join(repository.storeRoot, 'runs');
  let removed = 0;
  try {
    removed = (await readdir(runsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).length;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await rm(runsRoot, { recursive: true, force: true });
  return { removed_runs: removed, repository: repository.worktree };
}

function parseList(value) {
  if (value === undefined || value === '') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseCliArgs(argv) {
  const values = [...argv];
  const command = values.shift() ?? 'help';
  const options = { command, worktree: process.cwd(), json: false };
  while (values.length) {
    const value = values.shift();
    if (value === '--worktree') options.worktree = values.shift();
    else if (value === '--run-id') options.runId = values.shift();
    else if (value === '--kind') options.kind = values.shift();
    else if (value === '--acceptance') options.acceptanceIds = parseList(values.shift());
    else if (value === '--risks') options.riskSignals = parseList(values.shift());
    else if (value === '--parent-run-id') options.parentRunId = values.shift();
    else if (value === '--head') options.headSha = values.shift();
    else if (value === '--reviewers') options.reviewers = parseList(values.shift());
    else if (value === '--lease-id') options.leaseId = values.shift();
    else if (value === '--evidence-file') options.evidenceFile = values.shift();
    else if (value === '--confirm') options.confirm = true;
    else if (value === '--json') options.json = true;
    else throw new Error(`Unknown loop-controller option: ${value}`);
  }
  return options;
}

async function evidenceFromFile(file) {
  return readJson(path.resolve(nonEmptyString(file, 'evidence_file')), 'evidence file');
}

const cliActions = Object.freeze({
  async start(options) { return startRun(options); },
  async supersede(options) { return supersedeLegacyRun(options); },
  async status(options) { return showRun(options); },
  async list(options) { return listRuns(options); },
  async insights(options) { return repositoryInsights(options); },
  async purge(options) { return purgeRepositoryEvidence(options); },
  async milestone(options) { return recordMilestone({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async verify(options) { return recordVerification({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async 'review-begin'(options) { return beginReview(options); },
  async 'review-complete'(options) { return completeReview({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async 'findings-triage'(options) { return triageFindings({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async 'fix-complete'(options) { return recordFix({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async complete(options) { return completeRun({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async block(options) { return blockRun({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
  async resume(options) { return resumeBlockedRun({ ...options, evidence: await evidenceFromFile(options.evidenceFile) }); },
});

const cliHelp = `loop-controller <command> [options]

Commands:
  start --kind <delivery|bugfix> --acceptance <AC-1,AC-2> [--risks <risk,...>]
  supersede --run-id <legacy-id> --confirm
  status --run-id <id>
  milestone|verify|review-complete|findings-triage|fix-complete|complete|block|resume
      --run-id <id> --evidence-file <path>
  review-begin --run-id <id> --head <sha> --reviewers <role,...>
  list | insights
  purge --confirm

Shared options:
  --worktree <path>   Canonical Git worktree root; defaults to cwd
  --json              Emit machine-readable JSON
`;

export async function runLoopControllerCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const options = parseCliArgs(argv);
    if (options.command === 'help' || options.command === '--help') {
      stdout.write(cliHelp);
      return 0;
    }
    const action = cliActions[options.command];
    if (!action) throw new Error(`Unknown loop-controller command: ${options.command}`);
    const result = await action(options);
    stdout.write(`${JSON.stringify(result, null, options.json ? 2 : 0)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  process.exitCode = await runLoopControllerCli(process.argv.slice(2));
}
