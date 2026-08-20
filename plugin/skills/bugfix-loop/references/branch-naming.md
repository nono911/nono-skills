# Contextual branch naming

Read this reference only when a managed loop must propose or create a new CLI branch. Do not rename an existing or host-managed branch merely to apply this guidance.

The loop applies this reference automatically before branch approval. The user does not need to invoke a naming helper or supply a prefix.

## Resolve the name

Use the first applicable source:

1. Repository instructions, documented conventions, issue automation, or protected-branch policy.
2. A valid branch name explicitly supplied by the user.
3. A host-required name when the host owns worktree creation.
4. Otherwise derive a host-neutral name from the primary change outcome.

Do not use an agent or vendor prefix such as `codex/`, `claude/`, or `agent/` by default. Such a prefix is acceptable only when the repository or host requires it.

## Derive a contextual fallback

Choose one prefix that represents the primary change:

- `feature/` for a new user-facing, operator-facing, API, or product capability
- `fix/` for an ordinary defect correction
- `hotfix/` only for an explicitly urgent production repair or an established hotfix process; never infer it from severity alone
- `docs/` for documentation-only work
- `refactor/` for behavior-preserving restructuring
- `test/` for test-only work
- `perf/` for performance-focused work
- `migration/` for a migration whose repository convention treats it as its own change class
- `release/` for release preparation
- `chore/` for tooling, dependency, configuration, or maintenance work that fits no more specific class

Append a short kebab-case outcome slug, optionally with the repository's issue identifier, for example `feature/booking-cancellation`, `fix/123-expired-session`, or `docs/operator-guide`. Prefer the dominant deliverable when a coherent change touches multiple types; do not concatenate several prefixes.

Before approval, show the exact base, branch, and worktree path. If the repository convention conflicts with the inferred change type, follow the repository and state the reason without asking unless the choice changes automation, permissions, or release policy.
