# Nono Skills

A lightweight, reasoning-first engineering workflow pack for Codex. It provides 16 namespaced skills built around outcomes, evidence, verification, material decisions, and human escalation.

The pack is designed for capable reasoning models such as GPT-5.6 Sol. Skills define intent and guardrails while leaving implementation strategy to the model. They do not impose mandatory design or implementation approval gates, worktrees, test-first development, or subagent orchestration unless the user explicitly invokes the focused `$engineering:review-loop` workflow. The only built-in gate is consent before Codex creates a durable workspace that the user did not explicitly request.

## How it works

- Install once, start a new Codex task, and ask for engineering work naturally. Explicit `$engineering:<skill>` invocation remains optional.
- Small tasks stay artifact-free.
- For work worth resuming or tracking, Codex proposes an isolated `docs/agent/work/<work-id>/` workspace and asks once before creating it.
- An explicit request for a spec, plan, log, findings tracker, handoff, or named existing work item already grants artifact consent for that scope.
- After approval, Codex maintains that work item's spec, plan, material decisions, findings, and handoff as needed without asking for every file update.
- Codex asks again only for an ambiguous work-item match, material scope expansion, or an action that needs new authority.

## Install

Requires Node.js 20 or newer and Codex CLI with plugin support.

```bash
npx nono-skills install
```

Then work normally:

```text
Implement user authentication and keep me updated.
```

For a durable task, Codex may propose:

```text
This work has multiple stages and should remain resumable. I propose
docs/agent/work/2026-07-16-user-auth/ for its spec, plan, and material
decisions. Approve this workspace?
```

Declining keeps the work in the current conversation and creates no workflow files.

Skills appear under the `engineering` namespace when you want to invoke one explicitly:

```text
$engineering:plan
$engineering:implement
$engineering:review
$engineering:review-loop
$engineering:fix-findings
$engineering:architecture-review
$engineering:security-review
$engineering:test
$engineering:debug
$engineering:refactor
$engineering:release-readiness
$engineering:brainstorm
$engineering:estimate
$engineering:migration
$engineering:api-design
$engineering:database-design
```

### Choosing a skill

| Intent | Skill |
|---|---|
| Explore options before choosing a direction | `$engineering:brainstorm` |
| Turn defined work into a verifiable execution map | `$engineering:plan` |
| Build a general software change | `$engineering:implement` |
| Correct validated findings | `$engineering:fix-findings` |
| Review a change without editing it | `$engineering:review` |
| Implement, commit, and independently re-review until clean | `$engineering:review-loop` |
| Assess security as the primary objective | `$engineering:security-review` |
| Evaluate system structure and change cost | `$engineering:architecture-review` |
| Isolate a root cause from runtime evidence | `$engineering:debug` |
| Add focused behavioral or regression tests | `$engineering:test` |
| Improve internal structure without changing behavior | `$engineering:refactor` |
| Assess merge, release, or deployment readiness | `$engineering:release-readiness` |
| Estimate effort with ranges and uncertainty | `$engineering:estimate` |
| Design a reversible transition | `$engineering:migration` |
| Design a stable consumer contract | `$engineering:api-design` |
| Design persistent data around invariants | `$engineering:database-design` |

## Two-commit review loop

Use `$engineering:review-loop` when a feature should pass through implementation, an independent code review, and verified remediation before it is considered complete.

Start from the intended feature branch with a clean working tree, then open a new Codex task and invoke the skill explicitly:

```text
$engineering:review-loop

Implement feature: add booking cancellation.

Acceptance criteria:
- only the booking owner can cancel
- started bookings cannot be cancelled
- return not found for an unknown booking
- add regression tests

You may create the implementation commit and the final review-fix commit.
Do not push.
```

The workflow runs in this order:

1. Record the starting revision, implement the feature, and run the repository's required checks.
2. Create the implementation commit after explicit commit authorization.
3. Spawn a fresh reviewer subagent that cannot edit, stage, commit, revert, or delegate work.
4. Validate actionable findings, fix them with the original agent, and run the relevant checks.
5. Review the complete feature diff again with a new reviewer. Repeat until the result is `CLEAN` or the bounded loop requires human input.
6. Run final verification and create a review-fix commit when review produced code changes.

The reviewer reports evidence-backed correctness, compatibility, security, reliability, maintainability, and test-coverage defects. Style preferences and unsupported speculation do not block completion. The default limit is five review rounds; repeated or disputed findings are escalated instead of being silently closed.

Commit authorization is deliberate. A general request such as `Implement this feature` normally uses `$engineering:implement` and does not authorize commits. Invoking `$engineering:review-loop` without granting commit permission causes Codex to ask before the first commit. If permission is included in the initial prompt, the workflow continues without asking again for the final review-fix commit. Pushes, deployments, and external writes always require separate authorization.

If the first independent review is already `CLEAN`, the implementation commit is the final code state and the workflow does not create an empty second commit. Ask explicitly and confirm your audit convention if an empty second commit is required.

## Optional repository guidance

`init` is optional. The plugin works without it. Run this only when the repository needs a starter `AGENTS.md` for its setup commands, architecture rules, verification commands, and local conventions:

```bash
npx nono-skills init
```

Initialization no longer creates task artifacts. Existing 0.1.0 singleton files under `docs/agent/` are preserved and new durable work uses per-work-item directories.

Preview changes or target another repository:

```bash
npx nono-skills init --dry-run
npx nono-skills init ../my-project
```

Existing differing files are reported as conflicts and no files are written. To replace them explicitly, create timestamped backups first:

```bash
npx nono-skills init --force
```

## Maintain the installation

```bash
npx nono-skills doctor
npx nono-skills update
npx nono-skills uninstall
```

Start a new Codex task after install or update so the refreshed skill definitions are loaded.

Uninstall preserves project files. Remove only installer-owned project files that still match their installed checksums with:

```bash
npx nono-skills uninstall --purge-project /path/to/project
```

Modified project files are always preserved. Purge never removes user-owned `docs/agent/work/<work-id>/` directories.

## Moving away from Superpowers

Install this plugin, start a new task, and verify the `engineering:*` skills first. Then open `/plugins`, select Superpowers, and press Space to disable it reversibly. After normal work succeeds without it, uninstall Superpowers from the plugin browser. Do not delete Codex plugin cache directories manually.

This pack intentionally does not reproduce strict test-first enforcement, automatic worktrees, mandatory design approval gates, or general subagent-driven execution. The focused `$engineering:review-loop` skill uses reviewer subagents only when explicitly invoked for the two-commit review workflow.

## Safety model

- The installer owns only the `engineering` plugin entry and source files recorded in its checksum manifest.
- Marketplace edits preserve unrelated entries and metadata.
- Install and update roll back plugin source and marketplace changes when Codex registration fails.
- Project files are never overwritten without `--force` and a backup.
- Codex-proposed durable workspaces require one explicit approval before creation; explicit artifact requests already provide consent for their scope.
- Work-item directories are user-owned, and uninstall purge never removes them.
- The CLI never disables or removes Superpowers automatically.

## Development

```bash
npm test
npm run validate
npm pack --dry-run
```

The runtime has no third-party dependencies.
