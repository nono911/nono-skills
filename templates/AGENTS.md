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
- Verify changed behavior with the strongest safe repository checks available. Report what ran and what remains unverified.

## Durable task state

Keep simple, one-shot work artifact-free; ask before creating a new durable workspace unless the user explicitly requested durable artifacts or named an existing work item.

Approved work lives under `docs/agent/work/<work-id>/`. Keep each feature isolated, let its `spec.md` define scope and status, record only material decisions, and never select another work item by recency alone. Repository-specific instructions override the default location.

## Definition of done

- The requested outcome and acceptance criteria are satisfied.
- Relevant targeted checks pass, followed by broader checks in proportion to risk.
- Compatibility, migration, security, and operational effects are addressed when applicable.
- Remaining risks, blockers, and unverified assumptions are explicit.

## Project conventions

Add architecture boundaries, naming rules, generated-file policy, release procedures, ownership, and recurring review guidance here only after they become repository facts.

## Skills

Let Codex select the smallest applicable set, or invoke one explicitly as `$engineering:<skill>` such as `$engineering:plan` or `$engineering:review`. Use the project-scoped `engineering_reviewer` agent for independent delivery-loop and bugfix-loop review when available. Use `$engineering:acceptance-verify` only against an identified safe test environment. Skills provide task-specific process; this file provides repository-specific truth.
