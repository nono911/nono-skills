# Execution Plan

- [x] Define Evidence Contract v1, event-specific validation, run states, immutable budgets, review leases, and recovery output. (`AC-1`–`AC-5`)
- [x] Implement atomic repository-local storage, run discovery/resume, event recording, state projection, terminal summaries, and inspection/purge APIs. (`AC-2`–`AC-5`, `AC-8`, `AC-9`)
- [x] Add capability requirement matching and evidence-backed selection reports to the provider bridge without weakening Native-first consent or role policy. (`AC-6`, `AC-7`)
- [x] Bundle identical controller and evidence references with both explicit loop skills; update their contracts for automatic strict control and fail-closed degradation. (`AC-1`–`AC-7`, `AC-10`, `AC-11`)
- [x] Aggregate completed local summaries into advisory repository insights with supporting run IDs and privacy tests. (`AC-8`)
- [x] Add CLI inspection surfaces and diagnostics without making them prerequisites for normal skill use. (`AC-9`)
- [x] Add unit, transition, replay, restart, concurrency, corruption, portability, contract, behavioral, and package tests. (`AC-1`–`AC-11`)
- [x] Update README and version metadata to 0.12.0, run all release gates, and record the readiness verdict. (`AC-10`, `AC-11`)
- [x] Add adaptive requirement discovery to `brainstorm` and `plan`, including no-redundant-question and blocking-ambiguity behavioral contracts. (`AC-11`)

# Verification Evidence

- `npm run prepublishOnly`: passed; 203 tests, plugin validation, and behavioral-corpus validation all succeeded.
- `npm run validate`: validated version 0.12.0 with the unchanged 18-skill inventory and identical portable controller/reference assets.
- `npm run eval:skills`: validated 90 provider-neutral cases across 18 skills and five activation categories.
- Controller coverage includes restart/resume, linked worktrees, atomic concurrency, stale and replayed leases, immutable fifth-batch exhaustion, failed-versus-blocked verification recovery, final-verification re-review, sensitive-key rejection, event/manifest corruption, local summaries, insights, and purge isolation.
- Agent bridge coverage includes every bundled adapter, role/capability filtering, local-history tie-break behavior, loop-context echo, structured finding categories, self-recursion prevention, consent, worktree identity, timeouts, and provider boundaries.
- Requirement-discovery coverage verifies that complete briefs proceed without redundant questions while user-visible ambiguity remains explicitly unresolved.
- `npm pack --dry-run --json`: `nono-skills@0.12.0`, 94 entries, 115,413-byte archive, runtime included, work-item development state excluded.
- `git diff --check` and JavaScript syntax checks passed.
- Local verification ran on macOS. The existing CI matrix will repeat test, validation, eval, and pack gates on Node.js 20 and 24 across Linux, macOS, and Windows after push; that remote CI run is not part of this uncommitted local result.
