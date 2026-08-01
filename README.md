# Nono Skills

[![CI](https://github.com/nono911/nono-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/nono911/nono-skills/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/nono-skills)](https://www.npmjs.com/package/nono-skills)

A reusable software-engineering skill pack for Codex and other Agent Skills hosts. It gives capable coding agents concise intent, evidence requirements, and escalation rules without forcing every task through a large workflow.

> **Project status:** experimental (`0.x`). Pin an exact version in repeatable setups and review release notes before updating.

## What it provides

- 18 focused skills for planning, implementation, review, testing, debugging, design, migration, QA, and release readiness.
- Two explicit engineering loops: `delivery-loop` for features and `bugfix-loop` for defects.
- Native Codex plugin installation under the `engineering` namespace.
- Universal installation for hosts supported by the open `skills` CLI.
- Deterministic contract validation plus paired skill-on/skill-off black-box host evaluation.

Normal work remains lightweight. `delivery-loop` and `bugfix-loop` run only when explicitly requested. Durable planning files and new worktrees require consent unless the request already authorizes them.

## Install

### Native Codex plugin

Requires Node.js 20 or newer and a Codex release with plugin support.

```bash
npx nono-skills install
```

Pin the installer for repeatable environments:

```bash
npx nono-skills@0.13.1 install
```

Start a new Codex task after installation or update. Skills appear as `$engineering:<name>`.

Optional repository scaffolding:

```bash
npx nono-skills init
```

`init` proposes an `AGENTS.md` and a project-scoped read-only reviewer definition. Existing differing files are not overwritten unless `--force` is explicitly used.

### Universal Agent Skills

```bash
npx skills@latest add nono911/nono-skills
```

The installer lets you choose skills, agents, scope, and copy or symlink mode. Install the complete pack when using either engineering loop so every companion skill is available.

Choose one installation method for the same host and scope. Installing both can expose duplicate skill names.

## Use

For ordinary work, ask naturally:

```text
Implement user authentication and verify the affected behavior.
```

Invoke a controlled loop explicitly when you want worktree isolation, bounded sequential review, and remediation:

```text
$engineering:delivery-loop

Add booking cancellation. Only the owner may cancel, started bookings cannot
be cancelled, and unknown bookings return not found. Add regression tests.
Do not push.
```

```text
$engineering:bugfix-loop

Checkout loses the authenticated session after refresh. Prove the cause,
add a regression test, fix it, and do not push.
```

Native subagents are the default. External local agent CLIs are considered only when the user selects External or Hybrid and approves the provider, source scope, worktree, and call bounds.

## Skills

| Intent | Skill |
|---|---|
| Explore a product or technical direction | `brainstorm` |
| Turn defined work into acceptance-linked steps | `plan` |
| Build a general software change | `implement` |
| Review a diff without editing it | `review` |
| Correct validated findings | `fix-findings` |
| QA a runnable user journey | `acceptance-verify` |
| Deliver a feature through bounded review | `delivery-loop` |
| Prove and fix an existing defect | `bugfix-loop` |
| Find a runtime root cause | `debug` |
| Add focused behavioral or regression tests | `test` |
| Review security as the primary objective | `security-review` |
| Review architecture and change cost | `architecture-review` |
| Improve structure without changing behavior | `refactor` |
| Check merge or deployment readiness | `release-readiness` |
| Estimate effort and uncertainty | `estimate` |
| Design a reversible transition | `migration` |
| Design a stable consumer contract | `api-design` |
| Design persistent data around invariants | `database-design` |

Universal installations use the names shown by the current host. Do not assume the Codex `$engineering:` prefix outside the native plugin.

## What is actually enforced

| Layer | Guarantee |
|---|---|
| Skill text | Guidance interpreted by the host model; activation and compliance are host-dependent. |
| Loop controller | Validates transitions, fixed budgets, exact-HEAD review leases, and evidence shape after a managed run has been started and while the agent continues to invoke it. |
| Evidence records | Local, structured, snapshot-bound, and hash-chained for tamper evidence. They are not tamper-proof and are not a security boundary. |
| Evaluation | Deterministic skill contracts plus paired black-box scenarios measure activation and workflow overhead; they do not prove every host will behave identically. |

The controller cannot force a model to activate a skill or call the controller. Reviewer independence and the truthfulness of supplied evidence also depend on the host and execution environment. See [Assurance boundaries](https://github.com/nono911/nono-skills/blob/main/docs/assurance.md).

## Loop limits

Review is sequential, not five reviews launched at once:

```text
review HEAD -> triage -> fix -> verify -> review new HEAD
```

One run allows at most five review batches, four fix cycles, and one no-verdict retry. A clean batch stops early. An actionable finding in batch five ends the run as `BUDGET_EXHAUSTED`; it does not silently extend the loop or mutate the reviewed state.

Run evidence is stored outside tracked source under the repository Git common directory at `.git/nono-skills/runs/`. It can be inspected or purged explicitly:

```bash
npx nono-skills runs list
npx nono-skills runs show <run-id>
npx nono-skills insights
npx nono-skills runs purge --force
```

## Maintenance

```bash
npx nono-skills doctor
npx nono-skills agents doctor
npx nono-skills eval
npx nono-skills update
npx nono-skills uninstall
```

Universal installations are maintained with `npx skills list`, `npx skills update`, and `npx skills remove`.

`npx nono-skills eval` validates the packaged corpus; it does not pretend to run a model. Export cases through a host adapter, then score captured results with activation metrics and a machine-readable confusion matrix:

```bash
npx nono-skills eval cases
npx nono-skills eval score host-results.json
npx nono-skills eval score host-results.json --json
```

## Documentation

- [Installation, initialization, and updates](https://github.com/nono911/nono-skills/blob/main/docs/installation.md)
- [Delivery and bugfix loops](https://github.com/nono911/nono-skills/blob/main/docs/engineering-loops.md)
- [Assurance boundaries and evidence](https://github.com/nono911/nono-skills/blob/main/docs/assurance.md)
- [Development, evaluation, and release policy](https://github.com/nono911/nono-skills/blob/main/docs/development.md)

## Development

```bash
npm test
npm run validate
npm run eval:skills
npm run eval:host
npm run test:coverage
npm pack --dry-run
```

The npm tarball excludes development-only tests and documentation. The tagged source, CI matrix, coverage output, contract corpus, and host-evaluation corpus remain public in this repository. Runtime code has no third-party dependencies.

## License

MIT
