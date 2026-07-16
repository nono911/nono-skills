# Codex Engineering Pack

Use this file for durable repository rules. Keep task-specific state in `docs/agent/` and reusable workflows in `.agents/skills/`.

## Operating contract

- Read the nearest applicable `AGENTS.md` and relevant project files before editing.
- Treat source code, executable configuration, migrations, tests, and observed runtime behavior as stronger evidence than stale prose.
- Infer routine implementation details. Ask the human only when a missing choice materially changes scope, behavior, risk, cost, or external state.
- Keep changes inside the requested scope. Do not mix unrelated cleanup into a task.
- Preserve backward compatibility unless the requirement explicitly changes it.
- Never expose secrets or copy production data into logs, fixtures, or prompts.
- Do not commit, push, merge, deploy, mutate production, or contact external parties unless the user explicitly authorizes that action.
- Before any authorized commit or push, verify the repository remote, local Git identity, worktree state, and applicable repository instructions.
- Prefer reversible actions. Stop before destructive or hard-to-reverse operations and request approval.
- Do not claim completion from inspection alone. Run the strongest safe verification available and distinguish verified facts from inferences and unverified assumptions.

## Artifact contract

Use these files as shared, recoverable task state:

- `docs/agent/spec.md`: goal, scope, constraints, acceptance criteria, unresolved product choices.
- `docs/agent/plan.md`: current execution map with statuses and verification targets.
- `docs/agent/decision-log.md`: append-only material decisions, evidence, and consequences.
- `docs/agent/findings.md`: review findings and their lifecycle.
- `docs/agent/handoff.md`: current state for resuming or transferring work.

Update only artifacts relevant to the task. Do not create log noise for obvious edits or every shell command.

## Decision logging

Append an entry when a choice is costly to reverse, changes a contract, resolves meaningful ambiguity, accepts a tradeoff, changes the plan, or relies on an assumption that future work must know.

Each entry contains:

- timestamp and status: `proposed`, `accepted`, `superseded`, or `rejected`
- context and decision
- alternatives considered
- evidence and rationale
- consequences and follow-up
- related files, issue, finding, or plan item

Never rewrite history silently. Add a new entry that supersedes the old one.

## Planning and execution

- A written plan is useful for multi-file, risky, ambiguous, or long-running work; it is not a mandatory ceremony for a trivial task.
- Keep one plan item in progress at a time unless independent parallel work is explicitly useful and authorized.
- Re-plan when evidence invalidates an assumption. Record only material changes.
- If acceptance criteria are clear and the requested action is safe and in scope, proceed without asking for routine approval.
- Keep `docs/agent/handoff.md` current before a long pause or when meaningful work remains.

## Review and findings

- Reviews are read-only unless the user explicitly asks for fixes.
- Lead with actionable findings ordered by severity: `critical`, `high`, `medium`, `low`.
- Every finding identifies evidence, impact, reproduction or reasoning, and a concrete remediation direction.
- Do not invent findings to fill a report. State when no actionable findings remain and list residual verification gaps.
- Finding states are `open`, `accepted`, `fixed`, `verified`, `wont-fix`, or `not-reproducible`.

## Verification

- Discover and use the repository's own lint, typecheck, test, build, migration, and validation commands.
- Start with targeted checks, then broaden in proportion to risk.
- For behavior changes, add or update tests that demonstrate the contract when a viable test harness exists.
- Record exact commands and meaningful outcomes in the final response or handoff. Do not say tests passed if they were not run.
- Treat deploy readiness and actual deployment as separate states.

## Repository commands and conventions

Add project-specific commands, architecture boundaries, naming rules, generated-file rules, and release procedures here as the team learns them. Prefer enforceable linters, hooks, schemas, and tests for mechanical rules.

## Skill selection

Invoke a skill explicitly with `$skill-name`, or let Codex select one from the task. Combine only the smallest set needed. Skills define intent and guardrails; they do not force every task through a fixed pipeline.

