import assert from 'node:assert/strict';

export const workspaceSection = `## Workspace protocol

Read \`references/workspaces.md\` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.`;

export const expectedDurableEndings = Object.freeze({
  'acceptance-verify': "When durable state is approved, update the selected work item's findings.md with scenario status, sanitized reproduction evidence, and verification gaps and append material environment, test-boundary, or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'api-design': "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.",
  'architecture-review': "When durable state is approved, append structural tradeoffs or accepted architecture risk to the selected work item's decisions.md and track actionable defects in findings.md; otherwise report them in the final response.",
  brainstorm: "When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.",
  'bugfix-loop': "When durable state is approved, update the selected work item's findings.md with reproduction, root-cause, regression, review-round, and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.",
  'communicate-clearly': "When durable state is approved, append only communication choices that change scope, ownership, acceptance, or stakeholder action to the selected work item's decisions.md; otherwise return the communication in the final response.",
  'database-design': "When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.",
  debug: "When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed debugging scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'delivery-loop': "When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.",
  estimate: "When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.",
  'fix-findings': "When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.",
  handoff: "When durable state is approved and work remains or ownership changes, update the selected work item's handoff.md with the continuation packet; otherwise return the packet in the final response.",
  implement: "When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.",
  migration: "When durable state is approved, append compatibility, sequencing, rollback, and point-of-no-return choices to the selected work item's decisions.md; otherwise include them in the final response.",
  plan: "When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.",
  refactor: "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed refactoring scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'release-readiness': "When durable state is approved, append only accepted release risk, waivers, rollback choices, and readiness-scope decisions to the selected work item's decisions.md; otherwise include them in the final response.",
  review: "When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.",
  'security-review': "When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.",
  test: "When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  'write-guide': "When durable state is approved, append material audience, scope, version, verification-boundary, or accepted-documentation-risk decisions to the selected work item's decisions.md; otherwise include them in the final response.",
});

export const expectedSkillWordBudgets = Object.freeze({
  'acceptance-verify': 1100,
  'bugfix-loop': 1500,
  'communicate-clearly': 650,
  'delivery-loop': 1500,
  handoff: 550,
  'write-guide': 850,
});

export const expectedRequiredResponsibilityLines = Object.freeze({
  brainstorm: Object.freeze([
    '- Inspect available user statements and in-scope evidence before questioning. Repository evidence shows current behavior, not desired user intent.',
    '- Establish the affected user or operator, problem or outcome, success signal, must-have and must-not behavior, and material constraints before ranking options.',
    '- Ask only when an unknown would change user-visible outcomes or option ranking. Ask one to three highest-leverage questions per round; never ask for facts safely discoverable from the repository.',
    '- State a reversible low-impact assumption and proceed when it cannot materially change the recommendation. Do not recommend while the core user, outcome, or success signal remains unknown.',
    '- Default to the smallest sufficient direction that satisfies the confirmed outcome and constraints; prefer reuse of existing product and technical paths before proposing new machinery.',
    '- Scale the option set to the decision. Do not invent alternatives to fill a quota; for a small reversible choice, one recommendation and one brief materially different alternative are enough.',
    '- Every recommended component must map to a confirmed requirement, in-scope evidence, or material current risk. Reject platform-building, generalized frameworks, and future-proofing justified only by hypothetical scale or unspecified reuse.',
    '- Keep optional enhancements and future possibilities outside the recommendation. Mention them only as `Not now` with a concrete signal that would justify reconsideration.',
  ]),
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
  'communicate-clearly': Object.freeze([
    '- Lead with the answer, outcome, or requested decision. Follow with only decision-relevant evidence, uncertainty, blockers, and a next action that actually exists.',
    '- Default to concise paragraphs. Keep simple answers to a sentence or short paragraph; use headings, lists, tables, examples, or nested structure only when they materially improve comprehension.',
    '- Use established repository or domain vocabulary when available. Define an ambiguous term once rather than replacing it with invented jargon. Avoid canned transitions, invented labels, unrequested contrast framing, and repeated conclusions.',
    '- External creation or mutation requires the user\'s scoped request and a capable connector. Without both, produce a draft and state that no external item changed.',
    '- Compose with the technical skill that owns implementation, review, testing, or debugging. This skill owns human-facing communication, not the underlying engineering operation.',
  ]),
  handoff: Object.freeze([
    '- Reference specs, plans, decisions, issues, commits, diffs, and evidence by path, identifier, or URL. Do not duplicate content already authoritative elsewhere.',
    '- Redact secrets, credentials, tokens, personal data, raw prompts, private reasoning, environment values, and unnecessary logs. Preserve only the minimum sanitized evidence needed to continue.',
    '- Do not edit production source, stage, commit, push, merge, deploy, change external work items, or alter workflow status as part of preparing the handoff.',
  ]),
  'write-guide': Object.freeze([
    '- An established-format update or copyable guide; a new standalone guide with unspecified format defaults to editable source plus visually verified PDF when supported',
    '- Never invent commands, paths, UI labels, permissions, prerequisites, screenshots, or successful outcomes.',
    '- Do not ask the user to enumerate discoverable features, routes, controls, or viewports; inspect the repository and runnable surface first.',
    '3. For a UI guide or multi-feature surface, read `references/ui-guides.md`; autonomously discover the runnable surface, routes, roles, visible actions, and layout evidence before asking, then map material outcomes to guides, captures, and verification.',
    '5. Use `acceptance-verify` when a runnable user journey or rendered UI is material; keep unexecuted or partially observed behavior explicitly unverified or blocked.',
    '7. When producing a file, read `references/output-formats.md`; preserve established documentation, select contextual defaults, and activate an available format-specific skill or host capability for each derivative.',
    '8. Capture actual rendered UI at material decision points or state changes using the repository\'s supported layout ranges; embed only useful, sanitized images with accessible text.',
    '- A request to create or update a local guide authorizes only the in-scope documentation change, not product-code changes, external publishing, or product decisions.',
    '- For UI guides, capture actual rendered states at material checkpoints rather than every click; when many controls share one surface, prefer one contextual capture plus a concise action table.',
    '- A PDF or other paginated deliverable is incomplete until every rendered page passes visual inspection after the latest meaningful change.',
  ]),
  implement: Object.freeze([
    '- Before production edits, map each applicable acceptance criterion or changed observable behavior to its strongest practical proof. Use a compact Behavior-to-Proof table only for multiple criteria or material risk.',
    '- When changed behavior is deterministic through a viable automated harness, prefer red-green-refactor: add the smallest behavioral test, run it and confirm the intended failure, implement the minimum change to pass, then refactor while the focused tests remain green.',
    '- Treat an explicit user request for TDD or test-first development as a requirement. If a meaningful red phase is impossible, stop and explain the evidence gap instead of silently switching workflows.',
    '- Add or update tests only when they provide meaningful proof of changed behavior or regression risk. For a reversible low-impact change, do not add a test that merely mirrors the implementation.',
    '- Run the focused checks required by the change. Broaden or repeat verification only when a failure, subsequent edit, repository requirement, or unresolved material risk justifies it.',
  ]),
  test: Object.freeze([
    '- Map each applicable acceptance criterion or changed observable behavior to the test boundary that proves it; keep a trivial single outcome artifact-light.',
    '- When paired with implementation and a viable deterministic harness, establish `RED` first with the smallest behavioral test and confirm it fails for the intended reason rather than setup error; after implementation, establish `GREEN` and keep it green through refactoring.',
    '- Treat an explicit request for TDD or test-first development as a sequencing requirement. If the behavior already passes, refine the proof or report that no meaningful red phase exists; never break production code to manufacture failure.',
    '- Stop when the smallest reliable set proves the requested behavior and required checks pass. Broaden or repeat only when a failure, subsequent edit, or uncovered material risk justifies it.',
  ]),
  plan: Object.freeze([
    '- Summarize the affected user or operator, desired observable behavior, must-have and must-not behavior, constraints, and success signals; separate confirmed intent, observed current behavior, inferences, and unknowns.',
    '- Ask only when an unresolved choice changes user-visible behavior, acceptance criteria, scope, compatibility, or irreversible risk. Ask one to three highest-leverage questions per round; never ask for facts safely discoverable from the repository.',
    '- Do not call a spec decision-ready or finalize its Acceptance Contract while such a blocking choice remains. Use `brainstorm` when the product or technical direction is still genuinely open.',
    '- State reversible low-impact assumptions and proceed when they cannot materially change the contract.',
    '- Default to the smallest sufficient change that satisfies confirmed outcomes and constraints; prefer existing paths, patterns, and components before adding new ones.',
    '- Every proposed component and plan item must map to a current requirement, acceptance criterion, repository fact, or material risk. Remove work justified only by generic flexibility, hypothetical scale, or unspecified future reuse.',
    '- For a small reversible change, prefer one to three outcome-based steps and a direct proof path; exceed that only when repository evidence or material risk requires separate work.',
    '- Define an Acceptance Contract with stable `AC-<number>` identifiers for every user-visible or externally observable outcome.',
    '- For each acceptance criterion, state the observable outcome, verification boundary, and expected evidence; include at least one verification method.',
    '- For multi-criterion or material-risk work, present a compact Behavior-to-Proof map linking each acceptance ID to its planned proof; omit the table for a trivial single outcome.',
    '- Link each execution-plan outcome to the affected acceptance IDs when applicable; do not invent acceptance criteria for purely enabling internal tasks.',
    '- Before finalizing multi-step work, assess whether acceptance outcomes, affected components, cross-cutting risks, and unresolved decisions fit one independently verifiable change. If not, propose the smallest coherent slices and ask once for direction before creating artifacts for them.',
    '- Add negative, compatibility, rollout, or rollback criteria only when material to the risk.',
    '- Keep optional enhancements and future possibilities out of the current plan. Mention a deferred item only when useful, label it `Not now`, and state the concrete evidence or threshold that would justify revisiting it.',
    '- Do not add a new abstraction, dependency, service, data store, migration, feature flag, observability stack, or rollout mechanism unless the current acceptance contract, repository evidence, or material risk requires it.',
  ]),
  'fix-findings': Object.freeze([
    '- When called by an orchestrating loop, handle one supplied finding batch and return dispositions and verification. Never invoke or request `review`, `delivery-loop`, `bugfix-loop`, or another fix loop; only the parent decides the next phase.',
    '- When standalone, recommend re-review when warranted but do not start another workflow without explicit authorization.',
  ]),
  review: Object.freeze([
    '- When called by an orchestrating loop, perform one bounded review pass and return. Never invoke or request another review, fix, delivery, bugfix, or delegated workflow; only the parent decides the next phase.',
  ]),
  'delivery-loop': Object.freeze([
    '- After approval, read `references/evidence-contract.md` and use the bundled controller before implementation. Start or resume one local run. If active schema-v1 blocks startup, show its ID and obtain approval for a linked v2 successor. Never ask the user to operate the controller or silently purge legacy evidence.',
    '- Treat the controller-issued run ID, evidence events, review leases, snapshots, and immutable budgets as authoritative across continuation, compaction, replanning, providers, and child returns. Never edit controller state directly or replace a rejected transition with prose.',
    '- Record implementation, verification, review, finding triage, fixes, blocks, and completion through Evidence Contract v2. Keep prompts, conversations, source, diffs, terminal logs, environment values, and secrets out of evidence.',
    '- Use the controller\'s capability plan and local insights only as evidence-linked advice for specialist selection. They never expand authority, scope, cost, or budgets or silently modify policy.',
    '- If strict control cannot execute or persist, stop this named loop. Offer ordinary implementation only with separate authority and never claim bounded or independently reviewed completion.',
    '- Refer to companions by frontmatter name, invoke them through the host\'s native mechanism, and never assume a literal invocation prefix.',
    '- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.',
    '- At approval offer `Native subagents (default)`, `External CLI agents`, and `Hybrid`; an unspecified choice means Native.',
    '- Probe or invoke external providers only after External, Hybrid, a named provider, or an options request. Then read `references/agent-delegation.md`, obtain explicit per-run consent before sharing source, and never invoke the current host externally.',
    '- Match agents to required roles and enforceable capabilities rather than provider names. Use one writer per file boundary, isolate delegated writers, and keep integration, verification, Git operations, and official commits with the orchestrator.',
    '- Reuse a host-managed worktree without nesting or renaming it. Otherwise use a dedicated task worktree with an unambiguous base, read `references/branch-naming.md` before proposing its branch, and never move a detached task or check out its branch elsewhere.',
    '- Otherwise propose the exact base, branch, and worktree and request one approval for creation and two local commits unless already authorized. The implementation commit may be amended before review; one unpushed review-fix commit may be amended later.',
    '- Invocation alone grants neither worktree nor commit authority. In a reused worktree request only missing authority for up to two local commits.',
    '- Before editing require a fresh isolated read-only reviewer. Otherwise offer ordinary implementation with disclosed self-review or stop; that path cannot report `CLEAN`.',
    '- Before isolation approval, decide whether the request fits one independently verifiable change. Otherwise activate `plan`, propose coherent slices, and ask which to deliver before creating artifacts, a worktree, or a controller run.',
    '2. For multi-step work activate `plan` before implementation; keep small well-defined features artifact-light and follow workspace consent for durable state.',
    '3. Keep the original agent as orchestrator and activate `implement` for the smallest complete TDD-preferred feature with acceptance-linked proof.',
    '1. Before every round, obtain a controller review lease for the exact HEAD and capability-matched reviewer batch. Use a fresh project-scoped read-only reviewer agent or subagent, activate `review`, and forbid delegation or mutation. If unavailable, stop; a non-independent fallback cannot report `CLEAN`.',
    '2. The controller exclusively owns the review-batch counter; the original orchestrator owns transitions. Every child performs one leased bounded pass, returns Evidence Contract output, and never invokes or requests another review or loop.',
    '6. Ingest the review, preserve claimed severity, and record one structured disposition for every finding before editing. Low findings are `non-blocking`; unrelated valid defects are `out-of-scope`; insufficient claims are `unvalidated` and never enter a fix cycle.',
    '7. Keep the original agent as fixer and activate `fix-findings` once for actionable findings. Validate the changed scope and dispositions; never let a reviewer modify the feature.',
    '8. Create the loop-owned review-fix commit on the first fix cycle and amend only that unpushed commit on later cycles. Ingest the new committed HEAD and verification evidence, then acquire a fresh lease.',
    '- Run rounds sequentially: review, validate and fix findings, verify, then start a fresh review. Never launch all five rounds at once.',
    '- The controller enforces five batches, four fix cycles, and one no-verdict retry for the entire delivery run. Its persisted counters are monotonic and non-renewable; `continue`, extra commit authority, provider changes, or more-round requests never reset or extend them.',
    '- Never review the same HEAD twice. The sole no-verdict retry reuses its numbered batch and a fresh lease.',
    '- If fifth-batch triage confirms an actionable defect, accept the controller\'s `BUDGET_EXHAUSTED` transition, do not mutate, and report its recovery record. A narrower linked run needs explicit approval and never makes this run `CLEAN`.',
    '5. Complete the controller run only after final evidence passes. Preserve worktrees unless removal is authorized. Lead the report with outcome, commits, acceptance-to-proof mapping, budgets, findings, checks, delegation, insights, and risks. Always print the controller\'s `CLEAN` or `CLEAN_WITH_RESIDUALS` completion kind and list every residual finding with severity, disposition, reason code, and location.',
  ]),
  'bugfix-loop': Object.freeze([
    '- After approval, read `references/evidence-contract.md` and use the bundled controller before diagnosis or implementation. Start or resume one local run. If active schema-v1 blocks startup, show its ID and obtain approval for a linked v2 successor. Never ask the user to operate the controller or silently purge legacy evidence.',
    '- Treat the controller-issued run ID, evidence events, review leases, snapshots, and immutable budgets as authoritative across continuation, compaction, replanning, providers, and child returns. Never edit controller state directly or replace a rejected transition with prose.',
    '- Record diagnosis, implementation, verification, review, finding triage, fixes, blocks, and completion through Evidence Contract v2. Keep prompts, conversations, source, diffs, terminal logs, environment values, and secrets out of evidence.',
    '- Use the controller\'s capability plan and local insights only as evidence-linked advice for specialist selection. They never expand authority, scope, cost, or budgets or silently modify policy.',
    '- If strict control cannot execute or persist, stop this named loop. Offer ordinary bug fixing only with separate authority and never claim bounded or independently reviewed completion.',
    '- Refer to companions by frontmatter name, invoke them through the host mechanism, and never assume a literal invocation prefix.',
    '- Core companions are `debug`, `test`, `implement`, `review`, and `fix-findings`. Use `acceptance-verify` when the symptom is a runnable user journey and security, architecture, or migration specialists only when the changed risk requires them.',
    '- Match agents to required roles and enforceable capabilities rather than provider names; Native remains the default and external execution retains its consent boundary.',
    '- Reuse a host-managed worktree without nesting or renaming it. Otherwise use a dedicated task worktree with an unambiguous base, read `references/branch-naming.md` before proposing its branch, and never move a detached task or check out its branch elsewhere.',
    '- Otherwise propose the exact base, branch, and worktree and request one approval for creation and two local commits unless already authorized. The bugfix commit may be amended before review; one unpushed review-fix commit may be amended later.',
    '- Invocation alone grants neither worktree nor commit authority. In a reused worktree request only missing authority for up to two named local commits and repeat excluded actions.',
    '- Before editing require a fresh isolated read-only reviewer. Otherwise offer ordinary bug fixing with disclosed self-review or stop; that path cannot report `CLEAN`.',
    '3. Activate `debug` to trace the runtime and data path, falsify alternatives, and support a root cause before changing production code.',
    '5. Activate `test` for the smallest stable regression proof; before fixing, confirm it fails through the supported causal path rather than setup error.',
    '1. Activate `implement` to correct the supported root cause with the smallest compatible change.',
    '1. Before every round, obtain a controller review lease for the exact HEAD and capability-matched reviewer batch. Use a fresh project-scoped read-only reviewer agent or subagent, activate `review`, and forbid delegation or mutation. If unavailable, stop; a non-independent fallback cannot report `CLEAN`.',
    '2. The controller exclusively owns the review-batch counter; the original orchestrator owns transitions. Every child performs one leased bounded pass, returns Evidence Contract output, and never invokes or requests another review or loop.',
    '6. Ingest the review, preserve claimed severity, and record one structured disposition for every finding before editing. Low findings are `non-blocking`; unrelated valid defects are `out-of-scope`; insufficient claims are `unvalidated` and never enter a fix cycle.',
    '7. Keep the original agent as fixer and activate `fix-findings` once for actionable findings. Validate the changed scope and dispositions; never let a reviewer modify the bugfix.',
    '8. Create the loop-owned review-fix commit on the first fix cycle and amend only that unpushed commit on later cycles. Strengthen regression proof, ingest the new committed HEAD and verification evidence, then acquire a fresh lease.',
    '- Run rounds sequentially. Never start future review rounds in advance; after a round finds actionable defects, validate, fix, and verify them before starting the next round.',
    '- The controller enforces five batches, four fix cycles, and one no-verdict retry for the entire bugfix run. Its persisted counters are monotonic and non-renewable; `continue`, extra commit authority, provider changes, or more-round requests never reset or extend them.',
    '- Never review the same HEAD twice. The sole no-verdict retry reuses its numbered batch and a fresh lease.',
    '- If fifth-batch triage confirms an actionable defect, accept the controller\'s `BUDGET_EXHAUSTED` transition, do not mutate, and report its recovery record. A narrower linked run needs explicit approval and never makes this run `CLEAN`.',
    '5. Complete the controller run only after final evidence passes. Preserve worktrees unless removal is authorized and report commits, causal evidence, budgets, findings, checks, relevant local insights, and residual risks. Always print the controller\'s `CLEAN` or `CLEAN_WITH_RESIDUALS` completion kind and list every residual finding with severity, disposition, reason code, and location.',
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

  // Markdown semantics do not change with the host operating system's line
  // endings, so validate a canonical representation.
  const normalizedContent = content.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const lines = authoritativeLines(normalizedContent);
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
    sectionBody(normalizedContent, sections, workspaceIndex).replace(/\n+$/, ''),
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
    const wordCount = normalizedContent.trim().split(/\s+/).length;
    assert.ok(
      wordCount <= wordBudget,
      `${name} must stay within its ${wordBudget}-word progressive-disclosure budget`,
    );
  }
}
