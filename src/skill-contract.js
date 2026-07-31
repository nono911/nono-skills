import assert from 'node:assert/strict';

export const workspaceSection = `## Workspace protocol

Read \`references/workspaces.md\` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.`;

export const expectedDurableEndings = Object.freeze({
  'acceptance-verify': "When durable state is approved, update the selected work item's findings.md with scenario status, sanitized reproduction evidence, and verification gaps and append material environment, test-boundary, or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'api-design': "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.",
  'architecture-review': "When durable state is approved, append structural tradeoffs or accepted architecture risk to the selected work item's decisions.md and track actionable defects in findings.md; otherwise report them in the final response.",
  brainstorm: "When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.",
  'bugfix-loop': "When durable state is approved, update the selected work item's findings.md with reproduction, root-cause, regression, review-round, and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.",
  'database-design': "When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.",
  debug: "When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed debugging scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'delivery-loop': "When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.",
  estimate: "When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.",
  'fix-findings': "When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.",
  implement: "When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.",
  migration: "When durable state is approved, append compatibility, sequencing, rollback, and point-of-no-return choices to the selected work item's decisions.md; otherwise include them in the final response.",
  plan: "When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.",
  refactor: "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed refactoring scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'release-readiness': "When durable state is approved, append only accepted release risk, waivers, rollback choices, and readiness-scope decisions to the selected work item's decisions.md; otherwise include them in the final response.",
  review: "When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'security-review': "When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.",
  test: "When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
});

export const expectedSkillWordBudgets = Object.freeze({
  'acceptance-verify': 1100,
  'bugfix-loop': 1500,
  'delivery-loop': 1500,
});

export const expectedRequiredResponsibilityLines = Object.freeze({
  'acceptance-verify': Object.freeze([
    '- No source edits, staging, commits, worktree creation, or fix loop',
    '- Scenario matrix with stable acceptance ID, user flow, one of `PASSED`, `FAILED`, or `BLOCKED`, and concise evidence',
    '- Treat a user-designated nonproduction environment and explicitly requested scenarios as authority for ordinary reversible test interactions. Use disposable data and the least privileged suitable account.',
    '- Request additional authority before production interaction, real purchases or charges, outbound messages, destructive or bulk actions, permission changes, irreversible state transitions, or access to sensitive data.',
    '3. Use an available real browser automation surface for UI criteria. Use project commands or an existing test harness to launch or prepare the application when helpful, but never substitute API or unit-test evidence for an unobserved UI assertion.',
    '7. Re-run an unexpected failure once from a clean state when safe. Keep the scenario `FAILED` if the defect occurred even when the retry passes, and report the observed reproduction rate as intermittent.',
    '- Mark `PASSED` only when every required observable assertion was exercised at the correct boundary and no collected evidence contradicts it.',
    '- Mark `FAILED` when any required assertion is false, an observed intermittent defect violates the criterion, or a material console or network failure breaks the journey.',
    '- Mark `BLOCKED` when setup, access, fixtures, environment health, tooling, or missing criteria prevent a meaningful verdict. Never convert an unexecuted or partially observed scenario into `PASSED`.',
    '- Set the overall verdict to `FAILED` when any scenario failed; otherwise `BLOCKED` when any scenario is blocked; otherwise `PASSED`.',
    '- Do not claim UI acceptance from API success, source inspection, automated test output, or reviewer opinion alone.',
    '- If the request also authorizes fixes, finish or safely stop the acceptance pass, hand off evidence, and let the original orchestrator select the appropriate implementation workflow. Do not start a nested delivery, bugfix, review, or fix loop.',
  ]),
  'release-readiness': Object.freeze([
    '- For a selected work item, read its acceptance criteria, current plan state, findings, and verification evidence when available before judging readiness; reading this state neither authorizes release nor by itself requires artifact mutation.',
  ]),
  plan: Object.freeze([
    '- Define an Acceptance Contract with stable `AC-<number>` identifiers for every user-visible or externally observable outcome.',
    '- For each acceptance criterion, state the observable outcome, verification boundary, and expected evidence; include at least one verification method.',
    '- Link each execution-plan outcome to the affected acceptance IDs when applicable; do not invent acceptance criteria for purely enabling internal tasks.',
    '- Add negative, compatibility, rollout, or rollback criteria only when material to the risk.',
  ]),
  'fix-findings': Object.freeze([
    '- When called by an orchestrating loop, handle one supplied finding batch and return dispositions and verification. Never invoke or request `review`, `delivery-loop`, `bugfix-loop`, or another fix loop; only the parent decides the next phase.',
    '- When standalone, recommend re-review when warranted but do not start another workflow without explicit authorization.',
  ]),
  review: Object.freeze([
    '- When called by an orchestrating loop, perform one bounded review pass and return. Never invoke or request another review, fix, delivery, bugfix, or delegated workflow; only the parent decides the next phase.',
  ]),
  'delivery-loop': Object.freeze([
    '- Refer to companion skills by their frontmatter names, such as `implement` or `review`. Invoke them through the host\'s native skill mechanism and any namespace assigned at installation; never assume a literal invocation prefix.',
    '- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.',
    '- At the approval gate, offer `Native subagents (default)`, `External CLI agents`, and `Hybrid`.',
    '- If the user approves without selecting a choice, use Native subagents.',
    '- Do not probe, propose, or invoke external providers unless the user explicitly selects External or Hybrid, names an external provider, or asks for external-agent options.',
    '- Read `references/agent-delegation.md` only after External or Hybrid is selected, then follow its provider, consent, isolation, result, and fallback contracts.',
    '- Require explicit per-run consent before sending repository content to an external provider.',
    '- Never invoke an external provider that owns the current host task; use that host\'s native agent mechanism instead.',
    '- Use one writer per file-ownership boundary, isolate every delegated writer in an approved child worktree, and keep integration, verification, Git operations, and official commits with the orchestrator.',
    '- If the task already runs in a host-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses to create a branch or hand off the task; do not move the task or check the same branch out elsewhere.',
    '- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.',
    '- Invoking `delivery-loop` alone is not worktree or commit authority. Only an explicit initial authorization for the exact proposed actions satisfies those gates.',
    '- When reusing any worktree, request only missing authority for up to two local commits.',
    '- If the user declines required worktree creation, do not continue this loop in the current checkout. Ask whether to switch to ordinary implementation there with explicit write and commit authority or stop; the switched path is outside delivery-loop completion.',
    '- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, task handoff, worktree removal, and branch deletion remain separate actions.',
    '- Do not copy ignored files or secrets or change host worktree rules without authorization.',
    '- Before implementation, confirm the host can create a fresh isolated read-only reviewer agent or subagent. If it cannot, disclose the limitation before editing and ask whether to switch to ordinary implementation with a non-independent self-review or stop. That degraded path is outside delivery-loop completion and must never report `CLEAN` or independently reviewed.',
    '2. When the feature warrants multi-step planning, explicitly activate the companion `plan` skill before implementation. Keep the plan in the current conversation unless a durable work-item workspace is approved; for a small well-defined feature, keep orchestration lightweight and do not create artifacts merely to satisfy the loop.',
    '3. Keep the original agent as orchestrator and explicitly activate the companion `implement` skill to deliver the smallest complete feature with appropriate tests.',
    '4. When a runnable user-facing journey is material, explicitly activate the companion `acceptance-verify` skill as a source-read-only QA specialist against the acceptance criteria. Keep the original agent as implementer, resolve validated failures, and rerun affected scenarios.',
    '1. For every round, use a fresh project-scoped read-only reviewer agent or subagent. Instruct it to activate `review` and forbid delegation or mutation. If it becomes unavailable, stop; a non-independent fallback is outside delivery-loop completion and must not report `CLEAN`.',
    '2. The original orchestrator exclusively owns the review-batch counter and may start each batch. Every child performs one bounded pass, returns its results, and never invokes or requests another review or loop. Only the orchestrator may update approved durable state.',
    '7. Keep the original agent as fixer and activate `fix-findings` once for the validated batch. Require dispositions and evidence back without re-review; never let a reviewer modify the feature.',
    '- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.',
    '- Run rounds sequentially: review, validate and fix findings, verify, then start a fresh review. Never launch all five rounds at once.',
    '- The absolute budget is five batches for the entire delivery run. Keep its counter monotonic across continuation, compaction, replanning, provider changes, and child returns; never reset it.',
    '- The budget is non-renewable. Generic approval, `continue`, extra commit authority, or a request for more rounds never extends it; do not ask the user to extend it.',
    '- Never review the same HEAD twice unless the earlier attempt returned no verdict; retry that failed attempt as the same numbered batch.',
    '- Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.',
    '- If the fifth batch finds an actionable defect, do not fix or mutate the reviewed state. Mark `BUDGET_EXHAUSTED`, report remaining findings and evidence, and stop without claiming `CLEAN` or creating the final commit.',
    '2. If final verification changes the state, activate `fix-findings`, fix, and start a fresh complete review within the five-round limit; with no round remaining, do not claim `CLEAN` or commit the changed state.',
    '4. If validated post-implementation fixes changed code and the resulting state passed fresh review and final verification, create the final review-fix commit. Do not create an empty second commit unless explicitly required.',
  ]),
  'bugfix-loop': Object.freeze([
    '- Refer to companion skills by their frontmatter names, such as `debug` or `review`. Invoke them through the host\'s native skill mechanism and any namespace assigned at installation; never assume a literal invocation prefix.',
    '- Core companions are `debug`, `test`, `implement`, `review`, and `fix-findings`. Use `acceptance-verify` when the symptom is a runnable user journey and security, architecture, or migration specialists only when the changed risk requires them.',
    '- If the task already runs in a host-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses to create a branch or hand off the task; do not move the task or check the same branch out elsewhere.',
    '- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.',
    '- Invoking `bugfix-loop` alone is not worktree or commit authority. Only an explicit initial authorization for the exact proposed actions satisfies those gates.',
    '- When reusing any worktree, request only missing authority for up to two local commits.',
    '- When only commit authority is missing, request the two named local commits and repeat the excluded actions.',
    '- If the user declines required worktree creation, do not continue this loop in the current checkout. Ask whether to switch to ordinary bug fixing there with explicit write and commit authority or stop; the switched path is outside bugfix-loop completion.',
    '- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, task handoff, worktree removal, and branch deletion remain separate actions.',
    '- Do not copy ignored files or secrets or change host worktree rules without authorization.',
    '- Before changing production code, confirm the host can create a fresh isolated read-only reviewer agent or subagent. If it cannot, disclose the limitation before editing and ask whether to switch to ordinary bug fixing with a non-independent self-review or stop. That degraded path is outside bugfix-loop completion and must never report `CLEAN` or independently reviewed.',
    '2. When the symptom is a runnable user-facing journey, explicitly activate the companion `acceptance-verify` skill as a source-read-only QA specialist to capture the observed boundary failure.',
    '3. Keep the original agent as orchestrator and explicitly activate the companion `debug` skill to trace the real runtime and data path, falsify plausible alternatives, and support a root cause before changing production code.',
    '5. Keep the original agent in control and explicitly activate the companion `test` skill to add the smallest stable regression test or repeatable check. Run it before the fix and confirm it fails because of the supported causal path, not because of an unrelated setup error.',
    '1. Keep the original agent as implementer and explicitly activate the companion `implement` skill to correct the supported root cause with the smallest compatible change.',
    '1. For every round, use a fresh project-scoped read-only reviewer agent or subagent. Instruct it to activate `review` and forbid delegation or mutation. If it becomes unavailable, stop; a non-independent fallback is outside bugfix-loop completion and must not report `CLEAN`.',
    '2. The original orchestrator exclusively owns the review-batch counter and may start each batch. Every child performs one bounded pass, returns its results, and never invokes or requests another review or loop. Only the orchestrator may update approved durable state.',
    '7. Keep the original agent as fixer and activate `fix-findings` once for the validated batch. Require dispositions and evidence back without re-review; never let a reviewer modify the bugfix.',
    '- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.',
    '- Run rounds sequentially. Never start future review rounds in advance; after a round finds actionable defects, validate, fix, and verify them before starting the next round.',
    '- The absolute budget is five batches for the entire bugfix run. Keep its counter monotonic across continuation, compaction, replanning, provider changes, and child returns; never reset it.',
    '- The budget is non-renewable. Generic approval, `continue`, extra commit authority, or a request for more rounds never extends it; do not ask the user to extend it.',
    '- Never review the same HEAD twice unless the earlier attempt returned no verdict; retry that failed attempt as the same numbered batch.',
    '- Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.',
    '- If the fifth batch finds an actionable defect, do not fix or mutate the reviewed state. Mark `BUDGET_EXHAUSTED`, report remaining findings and evidence, and stop without claiming `CLEAN` or creating the final review-fix commit.',
    '2. If final verification changes the state, activate `fix-findings`, fix, and start a fresh complete review within the five-round limit; with no round remaining, do not claim `CLEAN` or commit the changed state.',
    '4. If validated post-implementation fixes changed code and the resulting state passed fresh review and final verification, create the final review-fix commit. Do not create an empty second commit unless explicitly required.',
  ]),
});

const planDurableOutput = '- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory';

export const allowedArtifactLines = Object.freeze(Object.fromEntries(
  Object.entries(expectedDurableEndings).map(([name, ending]) => [
    name,
    Object.freeze(name === 'plan' ? [ending, planDurableOutput] : [ending]),
  ]),
));

const workspaceBody = workspaceSection.slice(workspaceSection.indexOf('\n\n') + 2);
const legacySingletonReference = /\bdecision-log\.md\b|\bdocs\/agent\/(?:spec|plan|decisions|decision-log|findings|handoff)\.md\b/i;
const workflowArtifactReference = /\b(?:spec|plan|decisions|findings|handoff)\.md\b/i;

function openingFence(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match || (match[1][0] === '`' && match[2].includes('`'))) return null;
  return { character: match[1][0], length: match[1].length };
}

function closesFence(line, fence) {
  const match = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
  return Boolean(
    match
      && match[1][0] === fence.character
      && match[1].length >= fence.length,
  );
}

function stripHtmlComments(line, commentOpen) {
  let cursor = 0;
  let text = '';
  let hadComment = commentOpen;

  while (cursor < line.length) {
    if (commentOpen) {
      const close = line.indexOf('-->', cursor);
      if (close === -1) return { commentOpen: true, hadComment: true, text };
      cursor = close + 3;
      commentOpen = false;
      hadComment = true;
    } else {
      const open = line.indexOf('<!--', cursor);
      if (open === -1) {
        text += line.slice(cursor);
        break;
      }
      text += line.slice(cursor, open);
      cursor = open + 4;
      commentOpen = true;
      hadComment = true;
    }
  }

  return { commentOpen, hadComment, text };
}

function authoritativeLines(content) {
  const sourceLines = content.split('\n');
  const lines = [];
  let fence = null;
  let htmlCommentOpen = false;
  let start = 0;

  for (let index = 0; index < sourceLines.length; index += 1) {
    const text = sourceLines[index];
    const hasLineEnding = index < sourceLines.length - 1;
    const end = start + text.length + (hasLineEnding ? 1 : 0);

    if (fence) {
      if (closesFence(text, fence)) fence = null;
    } else {
      const visible = stripHtmlComments(text, htmlCommentOpen);
      htmlCommentOpen = visible.commentOpen;
      if (!(visible.hadComment && visible.text.trim() === '')) {
        if (/^(?: {4}|\t)/.test(visible.text)) {
          start = end;
          continue;
        }
        const openedFence = openingFence(visible.text);
        if (openedFence) {
          fence = openedFence;
        } else {
          lines.push({
            text: visible.text,
            start,
            end,
          });
        }
      }
    }
    start = end;
  }

  return lines;
}

function normalizedLevelTwoHeading(line) {
  const match = line.match(/^ {0,3}##(?!#)(?:[ \t]+(.*))?[ \t]*$/);
  if (!match) return null;
  const name = (match[1] ?? '')
    .trimEnd()
    .replace(/[ \t]+#+$/, '')
    .trim();
  return name || null;
}

function markdownSections(lines) {
  const sections = [];
  for (const line of lines) {
    const name = normalizedLevelTwoHeading(line.text);
    if (name) sections.push({ name, start: line.start, bodyStart: line.end });
  }
  return sections;
}

function uniqueSectionIndex(name, sections, skillName) {
  const indexes = sections
    .map((section, index) => (section.name === name ? index : -1))
    .filter((index) => index !== -1);
  assert.equal(
    indexes.length,
    1,
    `${skillName} must define exactly one normalized ${name} section`,
  );
  return indexes[0];
}

function sectionBody(content, sections, index) {
  const end = sections[index + 1]?.start ?? content.length;
  return content.slice(sections[index].bodyStart, end);
}

function normalizeInlineMarkdown(text) {
  return text
    .replace(/!?\[([^\]\n]*)\]\(((?:\\.|[^\\)\n])*)\)/g, '$1 $2')
    .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1')
    .replace(/[`*_~]/g, '');
}

function assertArtifactLines(name, lines) {
  const allowedLines = allowedArtifactLines[name];
  const normalizedLines = lines.map(({ text }) => ({
    normalized: normalizeInlineMarkdown(text),
    text,
  }));

  for (const { normalized } of normalizedLines) {
    assert.doesNotMatch(
      normalized,
      legacySingletonReference,
      `${name} must not reference legacy singleton workflow artifacts`,
    );
  }

  for (const { normalized, text } of normalizedLines) {
    if (workflowArtifactReference.test(normalized)) {
      assert.ok(
        allowedLines.includes(text.trim()),
        `${name} must use only allowed authoritative workflow artifact lines`,
      );
    }
  }

  for (const allowedLine of allowedLines) {
    assert.equal(
      normalizedLines.filter(({ text }) => text.trim() === allowedLine).length,
      1,
      `${name} must include each allowed authoritative workflow artifact line exactly once`,
    );
  }
}

function assertRequiredResponsibilityLines(name, lines) {
  for (const requiredLine of expectedRequiredResponsibilityLines[name] ?? []) {
    assert.equal(
      lines.filter(({ text }) => text.trim() === requiredLine).length,
      1,
      `${name} must include each required responsibility line exactly once`,
    );
  }
}

function finalAuthoritativeSectionLine(lines, sections, index) {
  const start = sections[index].bodyStart;
  const end = sections[index + 1]?.start ?? Number.POSITIVE_INFINITY;
  return lines
    .filter((line) => line.start >= start && line.start < end && line.text.trim() !== '')
    .at(-1)?.text.trim();
}

export function assertSkillWorkspaceContract(name, content) {
  const expectedEnding = expectedDurableEndings[name];
  assert.ok(expectedEnding, `${name} must be in the expected skill inventory`);

  const lines = authoritativeLines(content);
  const sections = markdownSections(lines);
  const purposeIndex = uniqueSectionIndex('Purpose', sections, name);
  const workspaceIndex = uniqueSectionIndex('Workspace protocol', sections, name);
  const decisionIndex = uniqueSectionIndex('Decision-log updates', sections, name);
  assert.equal(
    workspaceIndex,
    purposeIndex + 1,
    `${name} must place the Workspace protocol section immediately after Purpose`,
  );
  assert.equal(
    sectionBody(content, sections, workspaceIndex).replace(/\n+$/, ''),
    `\n${workspaceBody}`,
    `${name} must use the exact Workspace protocol section`,
  );

  assert.equal(
    finalAuthoritativeSectionLine(lines, sections, decisionIndex),
    expectedEnding,
    `${name} must end Decision-log updates with its durable-state contract`,
  );

  assertArtifactLines(name, lines);
  assertRequiredResponsibilityLines(name, lines);

  const wordBudget = expectedSkillWordBudgets[name];
  if (wordBudget) {
    const wordCount = content.trim().split(/\s+/).length;
    assert.ok(
      wordCount <= wordBudget,
      `${name} must stay within its ${wordBudget}-word progressive-disclosure budget`,
    );
  }
}
