# Repository Guidance

Keep this file specific to the repository. Replace placeholders with commands and conventions that are true here; remove sections that do not apply.

## Repository facts

- Setup:
- Lint:
- Typecheck:
- Test:
- Build:
- Important directories:

## Durable rules

- Treat executable code, configuration, tests, migrations, and observed behavior as stronger evidence than stale prose.
- Preserve unrelated behavior and backward compatibility unless the requirement changes it.
- Keep external writes, commits, pushes, merges, releases, deployments, and production mutations behind explicit user authorization.
- Verify changed behavior with the strongest safe repository checks available. Report what ran and what remains unverified.

## Task artifacts

Use existing files under `docs/agent/` only when they help the current task:

- `spec.md`: goal, scope, constraints, acceptance criteria, and unresolved product choices
- `plan.md`: current execution map, status, dependencies, and verification targets
- `decision-log.md`: material decisions, evidence, alternatives, and consequences
- `findings.md`: review findings and their lifecycle
- `handoff.md`: resumable state when work remains or ownership changes

Do not create missing workflow artifacts unless the user requests durable artifacts or runs `npx nono-skills init`. Without them, put the same material information in the final response.

Append a decision only when it changes a contract, resolves meaningful ambiguity, accepts risk or a costly tradeoff, changes the plan materially, or records an assumption future work must preserve. Supersede accepted entries instead of rewriting history. Do not log routine edits or shell commands.

## Definition of done

- The requested outcome and acceptance criteria are satisfied.
- Relevant targeted checks pass, followed by broader checks in proportion to risk.
- Compatibility, migration, security, and operational effects are addressed when applicable.
- Remaining risks, blockers, and unverified assumptions are explicit.

## Project conventions

Add architecture boundaries, naming rules, generated-file policy, release procedures, ownership, and recurring review guidance here only after they become repository facts.

## Skills

Let Codex select the smallest applicable set, or invoke one explicitly as `$engineering:<skill>` such as `$engineering:plan` or `$engineering:review`. Skills provide task-specific process; this file provides repository-specific truth.
