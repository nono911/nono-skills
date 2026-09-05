# Changelog

Notable user-visible changes are recorded here. Nono Skills is experimental
software: minor `0.x` releases may change workflow contracts, so repeatable
installations should pin an exact version.

## Unreleased

### Changed

- Aligned shared skill behavior with current GPT-6 Astra guidance while keeping
  the pack model- and host-neutral: explicit user instructions outrank skill
  defaults, routine details are inferred from context, and already-authorized
  work proceeds before a material question pauses it.
- Calibrated `implement` and `test` to avoid implementation-mirroring tests and
  repeated broad verification for reversible low-impact work once meaningful
  required checks pass.
- Tightened `communicate-clearly` and repository guidance around concise prose,
  purposeful formatting, direct language, and one conclusion.
- Extended paired host evaluation with total tool-call budgets, an Astra-relevant
  low-impact implementation case, and a concise-output budget for simple
  communication.

## 0.15.3 — 2026-08-29

### Changed

- `brainstorm` and `plan` now default to the smallest sufficient direction,
  require every proposed component or plan item to map to current evidence,
  acceptance, or material risk, and keep hypothetical future work outside the
  active scope with explicit reconsideration triggers.
- Small reversible decisions no longer require an artificial option quota or
  oversized execution map; new abstractions and operational machinery require
  a present, evidence-backed reason.
- Black-box host evaluation now measures output-word budgets for small planning
  and brainstorming tasks instead of rejecting brittle technology or section
  keywords, so concise scope is tested without penalizing valid explanations.

## 0.15.2 — 2026-08-20

### Changed

- New standalone guides with no established destination or format now default
  to editable source plus a visually verified PDF when the host has a suitable
  PDF capability, without requiring the user to invoke that capability.
  Existing documentation systems and explicit output choices still take
  precedence; unavailable export capability is reported as blocked.
- Managed loops now preserve host-managed branch names while CLI-created
  branches follow repository conventions or derive a host-neutral prefix from
  the actual change context, such as feature, fix, hotfix, docs, or refactor.
  This naming policy loads automatically before the branch approval request.

## 0.15.1 — 2026-08-18

### Added

- Added `write-guide` for audience-focused user, onboarding, setup, admin,
  operator, tutorial, and help-center documentation grounded in current product
  behavior. UI guides autonomously discover routes, roles, accessible controls,
  safe actions, and layout evidence before asking; they organize coverage by
  outcome, capture sanitized layout-aware states, and compose runnable journeys
  with `acceptance-verify`. Canonical source stays editable while optional PDF,
  DOCX, or HTML exports receive page-level render inspection, controlled page
  breaks, and regeneration until clean. Unobserved steps remain unverified or
  blocked.
- Added five activation-boundary cases for guide creation and its boundary with
  one-off communication, expanding the corpus to 105 cases across 21 skills.

## 0.15.0 — 2026-08-07

### Added

- Added `communicate-clearly` for direct, audience-aware explanations, status
  reports, decision requests, and platform-neutral project work items. Detailed
  work-item shaping loads only when that output is requested.
- Added explicit-only `handoff` packets that reference authoritative state,
  redact sensitive data, and identify the next executable action without
  mutating source or Git state.
- Added compact Behavior-to-Proof mapping for multi-criterion or material-risk
  plans and implementations.

### Changed

- Made general implementation TDD-preferred when deterministic behavior has a
  viable automated harness. Explicit TDD requests now require a demonstrated
  red phase or a disclosed blocker.
- Connected delivery-loop scope slicing, test-first feedback, acceptance-linked
  proof, and outcome-first final reporting without changing controller budgets.
- Added concise repository communication defaults and expanded the behavioral
  corpus to 100 cases across 20 skills.
- Kept host scoring within its observable boundary: semantic phrase assertions
  normalize hyphenated wording, while final `RED` and `GREEN` labels are not
  treated as proof of TDD execution order.

## 0.14.1 — 2026-08-04

### Changed

- Reworked the README around a host-aware quick start, top-level requirements,
  a concise product rationale, and a recommended documentation path.
- Added an evidence-calibrated host support matrix that distinguishes native
  validation from universal installer compatibility and unpublished behavior.
- Added a loop composition diagram and representative evaluation and managed-run
  output so new users can see the workflow and evidence shape before installing.
- Added contribution guidance, license and skill-count badges, and clearer issue
  reporting links without adding runtime behavior or new skills.

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

[Unreleased]: https://github.com/nono911/nono-skills/compare/v0.15.3...HEAD
[0.15.3]: https://github.com/nono911/nono-skills/compare/v0.15.2...v0.15.3
[0.15.2]: https://github.com/nono911/nono-skills/compare/v0.15.1...v0.15.2
[0.15.1]: https://github.com/nono911/nono-skills/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/nono911/nono-skills/compare/v0.14.1...v0.15.0
[0.14.1]: https://github.com/nono911/nono-skills/compare/v0.14.0...v0.14.1
[0.14.0]: https://github.com/nono911/nono-skills/compare/v0.13.1...v0.14.0
