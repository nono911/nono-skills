import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  beginReview,
  completeReview,
  completeRun,
  listRuns,
  planCapabilities,
  purgeRepositoryEvidence,
  recordFix,
  recordMilestone,
  recordVerification,
  repositoryInsights,
  resumeBlockedRun,
  runLoopControllerCli,
  showRun,
  startRun,
  supersedeLegacyRun,
  triageFindings,
} from '../plugin/runtime/loop-controller.mjs';

const execFile = promisify(execFileCallback);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

function eventDigest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex')}`;
}

async function git(repository, ...args) {
  const { stdout } = await execFile('git', ['-C', repository, ...args]);
  return stdout.trim();
}

async function createRepository(t) {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'nono-loop-'));
  t.after(() => rm(repository, { recursive: true, force: true }));
  await execFile('git', ['init', repository]);
  await git(repository, 'config', 'user.name', 'Loop Test');
  await git(repository, 'config', 'user.email', 'loop@example.com');
  await writeFile(path.join(repository, 'feature.txt'), 'base\n');
  await git(repository, 'add', 'feature.txt');
  await git(repository, 'commit', '-m', 'base');
  return repository;
}

async function commit(repository, content, message) {
  await writeFile(path.join(repository, 'feature.txt'), `${content}\n`);
  await git(repository, 'add', 'feature.txt');
  await git(repository, 'commit', '-m', message);
  return git(repository, 'rev-parse', 'HEAD');
}

function writer() {
  let output = '';
  return {
    stream: { write(chunk) { output += String(chunk); } },
    read: () => output,
  };
}

async function writeLegacyRun(repository, runId = 'legacy-run') {
  const canonicalRepository = await realpath(repository);
  const commonPath = await git(repository, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  const commonDirectory = await realpath(commonPath);
  const headSha = await git(repository, 'rev-parse', 'HEAD');
  const runRoot = path.join(commonDirectory, 'nono-skills', 'runs', runId);
  const createdAt = '2026-08-01T00:00:00.000Z';
  const state = {
    schema_version: 1,
    run_id: runId,
    kind: 'delivery',
    status: 'BLOCKED',
    parent_run_id: null,
    worktree: canonicalRepository,
    base_sha: headSha,
    current_head: headSha,
    acceptance_ids: ['AC-1'],
    risk_signals: [],
    budgets: {
      review_batches: { limit: 5, used: 0 },
      fix_cycles: { limit: 4, used: 0 },
      no_verdict_retries: { limit: 1, used: 0 },
    },
    active_review: null,
    retry_review: null,
    reviewed_heads: [],
    pending_findings: [],
    open_findings: [],
    blocked_from: 'VERIFYING',
    block_reason: 'legacy fixture',
    created_at: createdAt,
    updated_at: createdAt,
    event_sequence: 1,
  };
  const event = {
    schema_version: 1,
    event_id: 'legacy-event',
    sequence: 1,
    previous_event_hash: null,
    event_type: 'run.blocked',
    occurred_at: createdAt,
    evidence: {
      schema_version: 1,
      event_type: 'run.blocked',
      run_id: runId,
      actor: { provider: 'legacy', role: 'orchestrator', capabilities: [] },
      snapshot: { base_sha: headSha, head_sha: headSha },
      acceptance_ids: ['AC-1'],
      outcome: 'blocked',
      verification: { performed: [], not_run: [] },
      limitations: ['legacy fixture'],
    },
    state_after: state,
  };
  event.event_hash = eventDigest(event);
  await mkdir(path.join(runRoot, 'events'), { recursive: true });
  await writeFile(path.join(runRoot, 'manifest.json'), `${JSON.stringify({
    schema_version: 1,
    run_id: runId,
    kind: 'delivery',
    worktree: canonicalRepository,
    git_common_directory: commonDirectory,
    parent_run_id: null,
    created_at: createdAt,
  }, null, 2)}\n`);
  await writeFile(
    path.join(runRoot, 'events', '000001-run-blocked.json'),
    `${JSON.stringify(event, null, 2)}\n`,
  );
  return { runId, headSha };
}

function evidence(state, eventType, outcome, values = {}) {
  return {
    schema_version: 2,
    event_type: eventType,
    run_id: state.run_id,
    actor: values.actor ?? {
      provider: 'native-test',
      role: eventType === 'review.completed' ? 'reviewer' : 'orchestrator',
      capabilities: eventType === 'review.completed'
        ? ['headless', 'structured-output', 'read-only-review', 'no-delegation']
        : [],
    },
    snapshot: {
      base_sha: state.base_sha,
      head_sha: values.headSha ?? state.current_head,
    },
    acceptance_ids: values.acceptanceIds ?? state.acceptance_ids,
    outcome,
    verification: values.verification ?? { performed: [], not_run: [] },
    limitations: values.limitations ?? [],
    ...values.extra,
  };
}

async function prepareForReview(repository, state, label = 'implementation') {
  const headSha = await commit(repository, label, label);
  let result = await recordMilestone({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(state, 'implementation.completed', 'completed', {
      headSha,
      extra: { files: ['feature.txt'] },
    }),
  });
  result = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'verification.completed', 'passed', {
      verification: { performed: ['node test fixture passed'], not_run: [] },
    }),
  });
  return result.state;
}

function finding(id, category = 'compatibility', severity = 'high', headSha = 'set-by-caller') {
  return {
    id,
    severity,
    category,
    location: 'feature.txt:1',
    evidence_status: 'supported',
    evidence: {
      kind: 'reproduction',
      head_sha: headSha,
      summary: 'observable incompatible behavior',
      reference: 'feature contract reproduction',
    },
    impact: 'acceptance behavior fails',
    remediation: 'preserve the expected contract',
  };
}

function triageDisposition(findingId, disposition, values = {}) {
  const reasonCodes = {
    actionable: 'IN_SCOPE_VALIDATED',
    'non-blocking': 'LOW_SEVERITY',
    'out-of-scope': 'PREEXISTING_UNRELATED',
    duplicate: 'SAME_ROOT_CAUSE',
    stale: 'SUPERSEDED_BY_FIX',
    'not-reproducible': 'CONTRADICTED_BY_CHECK',
    'accepted-risk': 'OWNER_ACCEPTED',
    unvalidated: 'INSUFFICIENT_EVIDENCE',
  };
  return {
    finding_id: findingId,
    disposition,
    reason_code: values.reasonCode ?? reasonCodes[disposition],
    summary: values.summary ?? `${disposition} disposition supported by test evidence`,
    ...values.extra,
  };
}

async function reviewFinding(repository, state, findingItem) {
  const begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general'],
  });
  return completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'findings', {
      extra: {
        lease_id: begun.lease.lease_id,
        findings: [{
          ...findingItem,
          evidence: { ...findingItem.evidence, head_sha: state.current_head },
        }],
      },
    }),
  });
}

test('run identity persists outside the worktree and resumes independently of host sessions', async (t) => {
  const repository = await createRepository(t);
  const started = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
    riskSignals: ['authentication'],
  });
  assert.equal(started.created, true);
  assert.deepEqual(started.capability_plan.recommended_specialists, ['security-review']);
  assert.deepEqual(planCapabilities(['ui']).recommended_specialists, ['acceptance-verify']);

  const resumed = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-ignored-on-resume'],
  });
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.state.run_id, started.state.run_id);
  assert.deepEqual(resumed.state.acceptance_ids, ['AC-1']);
  assert.equal(resumed.state.budgets.review_batches.limit, 5);

  const commonDirectory = await git(repository, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  const runRoot = path.join(commonDirectory, 'nono-skills', 'runs', started.state.run_id);
  assert.equal((await readdir(path.join(runRoot, 'events'))).length, 1);
  assert.equal((await git(repository, 'status', '--porcelain')), '');
});

test('linked worktrees share the Git-common evidence store without sharing active run identity', async (t) => {
  const repository = await createRepository(t);
  const linkedParent = await mkdtemp(path.join(os.tmpdir(), 'nono-linked-'));
  t.after(() => rm(linkedParent, { recursive: true, force: true }));
  const linked = path.join(linkedParent, 'feature-worktree');
  await git(repository, 'worktree', 'add', '-b', 'feature-worktree', linked);

  const started = await startRun({
    worktree: linked,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  const mainCommon = await git(repository, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  const linkedCommon = await git(linked, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  assert.equal(await realpath(linkedCommon), await realpath(mainCommon));
  assert.equal(
    (await readdir(path.join(linkedCommon, 'nono-skills', 'runs', started.state.run_id, 'events'))).length,
    1,
  );

  const resumed = await startRun({
    worktree: linked,
    kind: 'delivery',
    acceptanceIds: ['AC-ignored-on-resume'],
  });
  assert.equal(resumed.state.run_id, started.state.run_id);
  await assert.rejects(
    showRun({ worktree: repository, runId: started.state.run_id }),
    /does not belong to this worktree/,
  );
});

test('linked worktrees can start concurrent runs in one Git-common evidence store', async (t) => {
  const repository = await createRepository(t);
  const linkedParent = await mkdtemp(path.join(os.tmpdir(), 'nono-linked-concurrent-'));
  t.after(() => rm(linkedParent, { recursive: true, force: true }));
  const linked = path.join(linkedParent, 'feature-worktree');
  await git(repository, 'worktree', 'add', '-b', 'concurrent-feature', linked);

  const [mainRun, linkedRun] = await Promise.all([
    startRun({ worktree: repository, kind: 'delivery', acceptanceIds: ['AC-main'] }),
    startRun({ worktree: linked, kind: 'bugfix', acceptanceIds: ['AC-linked'] }),
  ]);
  assert.equal(mainRun.created, true);
  assert.equal(linkedRun.created, true);
  assert.notEqual(mainRun.state.run_id, linkedRun.state.run_id);
  assert.equal((await listRuns({ worktree: repository })).length, 2);
  assert.equal((await showRun({ worktree: repository, runId: mainRun.state.run_id })).state.kind, 'delivery');
  assert.equal((await showRun({ worktree: linked, runId: linkedRun.state.run_id })).state.kind, 'bugfix');
});

test('event log recovers after a crash leaves stale state, lock, and temporary files', async (t) => {
  const repository = await createRepository(t);
  const started = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  const headSha = await commit(repository, 'crash-recovery', 'implementation before crash');
  const recorded = await recordMilestone({
    worktree: repository,
    runId: started.state.run_id,
    evidence: evidence(started.state, 'implementation.completed', 'completed', {
      headSha,
      extra: { files: ['feature.txt'] },
    }),
  });
  const shown = await showRun({ worktree: repository, runId: started.state.run_id });
  await writeFile(path.join(shown.runRoot, 'state.json'), `${JSON.stringify(started.state)}\n`);
  await writeFile(path.join(shown.runRoot, 'state.json.crashed.tmp'), '{incomplete');
  const lockPath = path.join(shown.runRoot, 'transition.lock');
  await writeFile(lockPath, 'crashed-process\n');
  const stale = new Date(Date.now() - 31_000);
  await utimes(lockPath, stale, stale);

  const recovered = await showRun({ worktree: repository, runId: started.state.run_id });
  assert.equal(recovered.state.status, 'VERIFYING');
  assert.equal(recovered.state.event_sequence, 2);
  assert.equal(recovered.state.current_head, recorded.state.current_head);
  const verified = await recordVerification({
    worktree: repository,
    runId: started.state.run_id,
    evidence: evidence(recovered.state, 'verification.completed', 'passed', {
      verification: { performed: ['crash recovery regression passed'], not_run: [] },
    }),
  });
  assert.equal(verified.state.status, 'READY_FOR_REVIEW');
  assert.equal(verified.state.event_sequence, 3);
});

test('clean evidence path reaches completion and produces a redacted local summary', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
    riskSignals: ['ui'],
  });
  state = await prepareForReview(repository, state);
  const begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general', 'acceptance-verify'],
  });
  state = begun.state;
  const reviewed = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(state, 'review.completed', 'clean', {
      verification: { performed: ['full diff reviewed'], not_run: [] },
      extra: { lease_id: begun.lease.lease_id, findings: [] },
    }),
  });
  state = reviewed.state;
  assert.equal(state.status, 'FINAL_VERIFYING');

  const verified = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(state, 'verification.completed', 'passed', {
      verification: { performed: ['npm test passed'], not_run: [] },
    }),
  });
  const completed = await completeRun({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(verified.state, 'run.completed', 'completed'),
  });
  assert.equal(completed.state.status, 'COMPLETE');

  const runs = await listRuns({ worktree: repository });
  assert.deepEqual(runs.map((run) => run.status), ['COMPLETE']);
  const shown = await showRun({ worktree: repository, runId: state.run_id });
  assert.equal(shown.events.length, 7);
  const summaryPath = path.join(shown.runRoot ?? '', 'summary.json');
  const commonDirectory = shown.manifest.git_common_directory;
  const summary = JSON.parse(await readFile(
    path.join(commonDirectory, 'nono-skills', 'runs', state.run_id, 'summary.json'),
    'utf8',
  ));
  assert.equal(summary.outcome, 'COMPLETE');
  assert.equal(JSON.stringify(summary).includes('full diff reviewed'), false);
  assert.equal(summaryPath.endsWith('summary.json'), true);
});

test('failed pre-review verification returns to implementation while blocked verification remains resumable', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  const firstHead = await commit(repository, 'implementation-v1', 'implementation v1');
  let result = await recordMilestone({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(state, 'implementation.completed', 'completed', {
      headSha: firstHead,
      extra: { files: ['feature.txt'] },
    }),
  });
  result = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'verification.completed', 'failed', {
      extra: { finding: finding('VERIFY-1', 'acceptance', 'high', result.state.current_head) },
    }),
  });
  assert.equal(result.state.status, 'IMPLEMENTING');
  assert.equal(result.remediation_required, true);

  const secondHead = await commit(repository, 'implementation-v2', 'implementation v2');
  result = await recordMilestone({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'implementation.completed', 'completed', {
      headSha: secondHead,
      extra: { files: ['feature.txt'] },
    }),
  });
  result = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'verification.completed', 'blocked', {
      limitations: ['test environment unavailable'],
    }),
  });
  assert.equal(result.state.status, 'BLOCKED');
  const resumed = await resumeBlockedRun({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'run.resumed', 'resumed'),
  });
  assert.equal(resumed.state.status, 'VERIFYING');
});

test('failed final verification becomes an actionable fix and requires fresh review', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'bugfix',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'bugfix-v1');
  const begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general'],
  });
  let result = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'clean', {
      extra: { lease_id: begun.lease.lease_id, findings: [] },
    }),
  });
  result = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'verification.completed', 'failed', {
      extra: { finding: finding('VERIFY-FINAL', 'regression', 'high', result.state.current_head) },
    }),
  });
  assert.equal(result.state.status, 'AWAITING_FIX');
  assert.deepEqual(result.state.open_findings.map((item) => item.id), ['VERIFY-FINAL']);

  const fixedHead = await commit(repository, 'bugfix-v2', 'review fix');
  result = await recordFix({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'fix.completed', 'completed', {
      headSha: fixedHead,
      extra: {
        files: ['feature.txt'],
        dispositions: [{
          finding_id: 'VERIFY-FINAL',
          disposition: 'fixed',
          evidence: 'final regression now passes',
        }],
      },
    }),
  });
  result = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(result.state, 'verification.completed', 'passed', {
      verification: { performed: ['final regression passed'], not_run: [] },
    }),
  });
  assert.equal(result.state.status, 'READY_FOR_REVIEW');
  assert.equal(result.state.budgets.fix_cycles.used, 1);
});

test('review leases reject replay and concurrent review starts', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state);
  const starts = await Promise.allSettled([
    beginReview({ worktree: repository, runId: state.run_id, headSha: state.current_head, reviewers: ['general'] }),
    beginReview({ worktree: repository, runId: state.run_id, headSha: state.current_head, reviewers: ['general'] }),
  ]);
  assert.equal(starts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(starts.filter((result) => result.status === 'rejected').length, 1);
  const begun = starts.find((result) => result.status === 'fulfilled').value;
  const resultEvidence = evidence(begun.state, 'review.completed', 'clean', {
    extra: { lease_id: begun.lease.lease_id, findings: [] },
  });
  await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: resultEvidence,
  });
  await assert.rejects(
    completeReview({
      worktree: repository,
      runId: state.run_id,
      leaseId: begun.lease.lease_id,
      evidence: resultEvidence,
    }),
    /requires REVIEWING|stale/,
  );
});

test('one no-verdict retry reuses the batch and a second failure blocks the run', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'bugfix',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'bugfix');
  let begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general'],
  });
  let reviewed = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'no-verdict', {
      limitations: ['reviewer timed out'],
      extra: { lease_id: begun.lease.lease_id, findings: [] },
    }),
  });
  assert.equal(reviewed.state.status, 'REVIEW_RETRY');
  begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: reviewed.state.current_head,
    reviewers: ['general'],
  });
  assert.equal(begun.lease.batch, 1);
  assert.equal(begun.lease.attempt, 2);
  assert.equal(begun.state.budgets.review_batches.used, 1);
  assert.equal(begun.state.budgets.no_verdict_retries.used, 1);
  reviewed = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'no-verdict', {
      limitations: ['provider returned no structured verdict'],
      extra: { lease_id: begun.lease.lease_id, findings: [] },
    }),
  });
  assert.equal(reviewed.state.status, 'BLOCKED');
  const resumed = await resumeBlockedRun({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'run.resumed', 'resumed'),
  });
  await assert.rejects(
    beginReview({
      worktree: repository,
      runId: state.run_id,
      headSha: resumed.state.current_head,
      reviewers: ['general'],
    }),
    /retry budget is exhausted/,
  );
});

test('fifth actionable batch exhausts immutable budget without mutation', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
    riskSignals: ['authentication'],
  });
  state = await prepareForReview(repository, state, 'version-0');
  for (let batch = 1; batch <= 5; batch += 1) {
    const begun = await beginReview({
      worktree: repository,
      runId: state.run_id,
      headSha: state.current_head,
      reviewers: ['general', 'security-review'],
    });
    const reviewed = await completeReview({
      worktree: repository,
      runId: state.run_id,
      leaseId: begun.lease.lease_id,
      evidence: evidence(begun.state, 'review.completed', 'findings', {
        extra: {
          lease_id: begun.lease.lease_id,
          findings: [finding(`F-${batch}`, 'security', 'high', begun.state.current_head)],
        },
      }),
    });
    const triaged = await triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [triageDisposition(`F-${batch}`, 'actionable')],
        },
      }),
    });
    state = triaged.state;
    if (batch === 5) break;
    const headSha = await commit(repository, `version-${batch}`, `fix ${batch}`);
    const fixed = await recordFix({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(state, 'fix.completed', 'completed', {
        headSha,
        extra: {
          files: ['feature.txt'],
          dispositions: [{
            finding_id: `F-${batch}`,
            disposition: 'fixed',
            evidence: 'regression check now passes',
          }],
        },
      }),
    });
    const verified = await recordVerification({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(fixed.state, 'verification.completed', 'passed', {
        verification: { performed: [`fix ${batch} regression passed`], not_run: [] },
      }),
    });
    state = verified.state;
  }
  assert.equal(state.status, 'BUDGET_EXHAUSTED');
  assert.equal(state.budgets.review_batches.used, 5);
  assert.equal(state.budgets.fix_cycles.used, 4);
  assert.deepEqual(state.recovery.allowed_next_actions, ['narrow-successor-run', 'accept-risk', 'stop']);
  const exhaustedHead = state.current_head;
  await assert.rejects(
    recordFix({ worktree: repository, runId: state.run_id, evidence: {} }),
    /terminal: BUDGET_EXHAUSTED/,
  );
  assert.equal(await git(repository, 'rev-parse', 'HEAD'), exhaustedHead);

  const insights = await repositoryInsights({ worktree: repository });
  assert.equal(insights.completed_runs, 1);
  assert.ok(insights.recommendations.some((item) => (
    item.risk_signal === 'authentication'
    && item.finding_category === 'security'
    && item.supporting_runs.includes(state.run_id)
  )));
});

test('low findings are non-blocking and cannot consume a fix cycle', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'low-finding');
  const reviewed = await reviewFinding(repository, state, finding('LOW-1', 'maintainability', 'low'));

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [triageDisposition('LOW-1', 'actionable')],
        },
      }),
    }),
    /low-severity findings cannot be actionable/,
  );

  const triaged = await triageFindings({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
      extra: {
        dispositions: [triageDisposition('LOW-1', 'non-blocking')],
      },
    }),
  });
  assert.equal(triaged.state.status, 'FINAL_VERIFYING');
  assert.equal(triaged.state.budgets.fix_cycles.used, 0);
  assert.deepEqual(triaged.state.open_findings, []);
});

test('non-blocking is reserved for low findings while valid unrelated defects can be out of scope', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'out-of-scope');
  const reviewed = await reviewFinding(repository, state, finding('HIGH-1'));

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [triageDisposition('HIGH-1', 'non-blocking')],
        },
      }),
    }),
    /non-blocking disposition requires a low-severity finding/,
  );

  const triaged = await triageFindings({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
      extra: {
        dispositions: [triageDisposition('HIGH-1', 'out-of-scope', {
          extra: {
            causal_relation: 'preexisting',
            scope_ref: 'AC-1 approved delivery scope',
          },
        })],
      },
    }),
  });
  assert.equal(triaged.state.status, 'FINAL_VERIFYING');
  assert.equal(triaged.state.budgets.fix_cycles.used, 0);
});

test('insufficient evidence cannot become actionable and completes with an unvalidated residual', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'insufficient-evidence');
  const unsupported = finding('UNVALIDATED-1', 'correctness', 'high');
  unsupported.evidence_status = 'insufficient';
  unsupported.evidence = {
    kind: 'observation',
    head_sha: 'set-by-caller',
    summary: 'the behavior looks suspicious but was not reproduced',
  };
  const reviewed = await reviewFinding(repository, state, unsupported);

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: { dispositions: [triageDisposition('UNVALIDATED-1', 'actionable')] },
      }),
    }),
    /insufficient evidence must be dispositioned unvalidated/,
  );

  const triaged = await triageFindings({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
      extra: { dispositions: [triageDisposition('UNVALIDATED-1', 'unvalidated')] },
    }),
  });
  assert.equal(triaged.state.status, 'FINAL_VERIFYING');
  assert.deepEqual(
    triaged.state.residual_findings.map((item) => [item.id, item.disposition]),
    [['UNVALIDATED-1', 'unvalidated']],
  );

  const verified = await recordVerification({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(triaged.state, 'verification.completed', 'passed', {
      verification: { performed: ['npm test passed'], not_run: [] },
    }),
  });
  const completed = await completeRun({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(verified.state, 'run.completed', 'completed'),
  });
  assert.equal(completed.completion_kind, 'clean_with_residuals');
  assert.equal(completed.state.completion_kind, 'clean_with_residuals');
  const summary = JSON.parse(await readFile(
    path.join(
      completed.state.worktree,
      '.git',
      'nono-skills',
      'runs',
      state.run_id,
      'summary.json',
    ),
    'utf8',
  ));
  assert.equal(summary.completion_kind, 'clean_with_residuals');
  assert.deepEqual(summary.residual_findings.map((item) => item.id), ['UNVALIDATED-1']);
});

test('not-reproducible and accepted-risk require structured proof', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'structured-dispositions');
  const begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general'],
  });
  await assert.rejects(
    completeReview({
      worktree: repository,
      runId: state.run_id,
      leaseId: begun.lease.lease_id,
      evidence: evidence(begun.state, 'review.completed', 'findings', {
        extra: {
          lease_id: begun.lease.lease_id,
          findings: [finding('STALE-EVIDENCE', 'correctness', 'high', state.base_sha)],
        },
      }),
    }),
    /evidence head_sha does not match the controlled snapshot/,
  );
  const reviewed = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'findings', {
      extra: {
        lease_id: begun.lease.lease_id,
        findings: [
          finding('NR-1', 'reliability', 'medium', begun.state.current_head),
          finding('RISK-1', 'compatibility', 'medium', begun.state.current_head),
        ],
      },
    }),
  });

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [
            triageDisposition('NR-1', 'not-reproducible'),
            triageDisposition('RISK-1', 'accepted-risk'),
          ],
        },
      }),
    }),
    /not-reproducible requires at least one attempted check/,
  );

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [
            triageDisposition('NR-1', 'not-reproducible', {
              extra: {
                attempted: [{
                  check: 'targeted regression',
                  at_head: state.current_head,
                  result: 'passed',
                }],
              },
            }),
            triageDisposition('RISK-1', 'accepted-risk'),
          ],
        },
      }),
    }),
    /accepted_by must be an object/,
  );

  const triaged = await triageFindings({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
      extra: {
        dispositions: [
          triageDisposition('NR-1', 'not-reproducible', {
            extra: {
              attempted: [{
                check: 'targeted regression',
                at_head: state.current_head,
                result: 'passed',
              }],
            },
          }),
          triageDisposition('RISK-1', 'accepted-risk', {
            extra: {
              accepted_by: {
                type: 'human',
                identity: 'human-owner@example.test',
                approval_ref: 'conversation-decision-1',
              },
            },
          }),
        ],
      },
    }),
  });
  assert.deepEqual(
    triaged.state.residual_findings.map((item) => item.disposition),
    ['not-reproducible', 'accepted-risk'],
  );
});

test('duplicate disposition must reference another known finding', async (t) => {
  const repository = await createRepository(t);
  let { state } = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  state = await prepareForReview(repository, state, 'duplicate-evidence');
  const begun = await beginReview({
    worktree: repository,
    runId: state.run_id,
    headSha: state.current_head,
    reviewers: ['general'],
  });
  const reviewed = await completeReview({
    worktree: repository,
    runId: state.run_id,
    leaseId: begun.lease.lease_id,
    evidence: evidence(begun.state, 'review.completed', 'findings', {
      extra: {
        lease_id: begun.lease.lease_id,
        findings: [
          finding('ROOT-1', 'correctness', 'high', state.current_head),
          finding('DUP-1', 'correctness', 'high', state.current_head),
        ],
      },
    }),
  });

  await assert.rejects(
    triageFindings({
      worktree: repository,
      runId: state.run_id,
      evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
        extra: {
          dispositions: [
            triageDisposition('ROOT-1', 'actionable'),
            triageDisposition('DUP-1', 'duplicate', { extra: { duplicate_of: 'UNKNOWN' } }),
          ],
        },
      }),
    }),
    /duplicate_of must reference another known finding/,
  );

  const triaged = await triageFindings({
    worktree: repository,
    runId: state.run_id,
    evidence: evidence(reviewed.state, 'findings.triaged', 'completed', {
      extra: {
        dispositions: [
          triageDisposition('ROOT-1', 'actionable'),
          triageDisposition('DUP-1', 'duplicate', { extra: { duplicate_of: 'ROOT-1' } }),
        ],
      },
    }),
  });
  assert.deepEqual(triaged.state.open_findings.map((item) => item.id), ['ROOT-1']);
  assert.deepEqual(triaged.state.residual_findings, []);
});

test('legacy schema v1 runs remain read-only and can be explicitly superseded without deletion', async (t) => {
  const repository = await createRepository(t);
  const legacy = await writeLegacyRun(repository);
  const listed = await listRuns({ worktree: repository });
  assert.deepEqual(
    listed.map((item) => [item.run_id, item.read_only, item.superseded_by_run_id]),
    [[legacy.runId, true, null]],
  );
  const shown = await showRun({ worktree: repository, runId: legacy.runId });
  assert.equal(shown.read_only, true);
  assert.equal(shown.manifest.schema_version, 1);

  await assert.rejects(
    resumeBlockedRun({
      worktree: repository,
      runId: legacy.runId,
      evidence: {},
    }),
    /Run schema version 1 is read-only/,
  );
  await assert.rejects(
    startRun({ worktree: repository, kind: 'delivery', acceptanceIds: ['AC-2'] }),
    /uses read-only schema version 1/,
  );
  await assert.rejects(
    supersedeLegacyRun({ worktree: repository, runId: legacy.runId }),
    /requires explicit confirmation/,
  );

  const successor = await supersedeLegacyRun({
    worktree: repository,
    runId: legacy.runId,
    confirm: true,
  });
  assert.equal(successor.created, true);
  assert.equal(successor.superseded, true);
  assert.equal(successor.superseded_run_id, legacy.runId);
  assert.equal(successor.state.schema_version, 2);
  assert.equal(successor.state.supersedes_run_id, legacy.runId);
  assert.deepEqual(successor.state.acceptance_ids, ['AC-1']);

  const repeated = await supersedeLegacyRun({
    worktree: repository,
    runId: legacy.runId,
    confirm: true,
  });
  assert.equal(repeated.created, false);
  assert.equal(repeated.state.run_id, successor.state.run_id);

  const after = await listRuns({ worktree: repository });
  const legacyListed = after.find((item) => item.run_id === legacy.runId);
  const successorListed = after.find((item) => item.run_id === successor.state.run_id);
  assert.equal(legacyListed.read_only, true);
  assert.equal(legacyListed.superseded_by_run_id, successor.state.run_id);
  assert.equal(successorListed.supersedes_run_id, legacy.runId);
  const legacyAfter = await showRun({ worktree: repository, runId: legacy.runId });
  assert.equal(legacyAfter.superseded_by_run_id, successor.state.run_id);
  assert.equal(legacyAfter.state.status, 'BLOCKED');

  const resumed = await startRun({
    worktree: repository,
    kind: 'delivery',
    acceptanceIds: ['AC-1'],
  });
  assert.equal(resumed.created, false);
  assert.equal(resumed.state.run_id, successor.state.run_id);
});

test('bundled controller CLI requires confirmation before superseding a legacy run', async (t) => {
  const repository = await createRepository(t);
  const legacy = await writeLegacyRun(repository, 'legacy-cli-run');
  const rejectedOut = writer();
  const rejectedErr = writer();
  assert.equal(await runLoopControllerCli([
    'supersede', '--worktree', repository, '--run-id', legacy.runId, '--json',
  ], { stdout: rejectedOut.stream, stderr: rejectedErr.stream }), 1);
  assert.equal(rejectedOut.read(), '');
  assert.match(rejectedErr.read(), /requires explicit confirmation/);

  const acceptedOut = writer();
  const acceptedErr = writer();
  assert.equal(await runLoopControllerCli([
    'supersede', '--worktree', repository, '--run-id', legacy.runId, '--confirm', '--json',
  ], { stdout: acceptedOut.stream, stderr: acceptedErr.stream }), 0);
  assert.equal(acceptedErr.read(), '');
  const result = JSON.parse(acceptedOut.read());
  assert.equal(result.superseded_run_id, legacy.runId);
  assert.equal(result.state.supersedes_run_id, legacy.runId);
});

test('evidence rejects sensitive payload keys and detects event corruption', async (t) => {
  const repository = await createRepository(t);
  const started = await startRun({
    worktree: repository,
    kind: 'bugfix',
    acceptanceIds: ['AC-1'],
  });
  await assert.rejects(
    recordMilestone({
      worktree: repository,
      runId: started.state.run_id,
      evidence: evidence(started.state, 'diagnosis.completed', 'completed', {
        extra: { causal_chain: 'supported path', prompt: 'raw private conversation' },
      }),
    }),
    /must not contain prompt/,
  );
  const shown = await showRun({ worktree: repository, runId: started.state.run_id });
  const manifestPath = path.join(shown.runRoot, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, run_id: 'wrong-run' })}\n`);
  await assert.rejects(
    showRun({ worktree: repository, runId: started.state.run_id }),
    /manifest run_id does not match/,
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const firstEvent = path.join(shown.runRoot, 'events', (await readdir(path.join(shown.runRoot, 'events')))[0]);
  const corrupted = JSON.parse(await readFile(firstEvent, 'utf8'));
  corrupted.state_after.status = 'COMPLETE';
  await writeFile(firstEvent, `${JSON.stringify(corrupted)}\n`);
  await assert.rejects(
    showRun({ worktree: repository, runId: started.state.run_id }),
    /digest is corrupted/,
  );
});

test('purge requires confirmation and removes only package-owned run evidence', async (t) => {
  const repository = await createRepository(t);
  await startRun({ worktree: repository, kind: 'delivery', acceptanceIds: ['AC-1'] });
  await assert.rejects(
    purgeRepositoryEvidence({ worktree: repository }),
    /explicit confirmation/,
  );
  const result = await purgeRepositoryEvidence({ worktree: repository, confirm: true });
  assert.equal(result.removed_runs, 1);
  assert.deepEqual(await listRuns({ worktree: repository }), []);
  assert.equal(await readFile(path.join(repository, 'feature.txt'), 'utf8'), 'base\n');
});
