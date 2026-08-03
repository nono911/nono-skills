# Changelog

Notable user-visible changes are recorded here. Nono Skills is experimental
software: minor `0.x` releases may change workflow contracts, so repeatable
installations should pin an exact version.

## Unreleased

## 0.14.0 — 2026-08-03

### Changed

- Evidence and managed-run state use schema version 2. Review findings now carry
  structured evidence bound to the exact reviewed HEAD.
- Severity remains an impact judgment and is never automatically lowered when
  evidence is incomplete.
- Finding triage uses exact disposition reason codes and disposition-specific
  proof. Only supported, in-scope critical, high, or medium findings enter a fix
  cycle.
- Managed completion is now `clean` or `clean_with_residuals`; unresolved
  non-actionable findings remain in a visible residual ledger.
- External review providers use the same structured finding evidence contract
  as native reviewers.

### Added

- `npx nono-skills runs supersede <v1-run-id> --confirm` creates an idempotent,
  linked v2 successor while preserving the v1 evidence chain unchanged.
- Canonical finding reason-code documentation and copyable disposition payload
  examples.
- A Codex host-evaluation adapter and stable repository fixture for paired
  skill-on/skill-off capture.

### Compatibility

- Schema-v1 runs remain available to `runs list` and `runs show` but cannot be
  resumed or mutated.
- An active v1 run must be explicitly superseded before its worktree can start a
  managed v2 run. Supersession inherits its kind, acceptance IDs, and risk
  signals but starts at the current committed HEAD.
- No v1 run is migrated, deleted, or silently replaced.

See [Upgrading from v0.13 to v0.14](docs/upgrading-to-0.14.md) for the migration
procedure and integration changes.

[Unreleased]: https://github.com/nono911/nono-skills/compare/v0.14.0...HEAD
[0.14.0]: https://github.com/nono911/nono-skills/compare/v0.13.1...v0.14.0
