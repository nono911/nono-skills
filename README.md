# Nono Skills

A lightweight, reasoning-first engineering workflow pack for Codex. It provides 16 namespaced skills built around outcomes, evidence, verification, material decisions, and human escalation.

The pack is designed for capable reasoning models such as GPT-5.6 Sol. Skills define intent and guardrails while leaving implementation strategy to the model. They do not impose mandatory design or implementation approval gates, worktrees, test-first development, or subagent orchestration unless the user explicitly invokes the focused `$engineering:delivery-loop` workflow. Outside that workflow, the only built-in gate is consent before Codex creates a durable workspace that the user did not explicitly request.

## How it works

- Install once, start a new Codex task, and ask for engineering work naturally. Explicit `$engineering:<skill>` invocation remains optional except for the intentionally explicit-only `$engineering:delivery-loop`.
- Small tasks stay artifact-free.
- For work worth resuming or tracking, Codex proposes an isolated `docs/agent/work/<work-id>/` workspace and asks once before creating it.
- An explicit request for a spec, plan, log, findings tracker, handoff, or named existing work item already grants artifact consent for that scope.
- After approval, Codex maintains that work item's spec, plan, material decisions, findings, and handoff as needed without asking for every file update.
- Codex asks again only for an ambiguous work-item match, material scope expansion, or an action that needs new authority.

## Install

Requires Node.js 20 or newer and Codex with plugin support. Codex CLI 0.145.0 or newer is recommended for the current multi-agent behavior and diagnostics.

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
$engineering:delivery-loop
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
| Deliver in an approved worktree through independent review | `$engineering:delivery-loop` |
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

## Isolated delivery loop

Use `$engineering:delivery-loop` when a feature should be isolated in a Git worktree, implemented, independently reviewed, and remediated before it is considered complete. This workflow is explicit-only and is not selected automatically.

In the ChatGPT desktop app, start the task in Worktree when practical; the workflow reuses that Codex-managed worktree and never creates a nested one. In CLI, IDE, or a Local task, start from the intended base checkout and invoke the skill explicitly. The current local checkout may contain unrelated changes because a separately approved feature worktree isolates them:

```text
$engineering:delivery-loop

Implement feature: add booking cancellation.

Acceptance criteria:
- only the booking owner can cancel
- started bookings cannot be cancelled
- return not found for an unknown booking
- add regression tests

Do not push.
```

When the task already runs in a Codex-managed worktree, Codex reuses it and requests only missing commit authority. Otherwise, unless the initial prompt already authorizes every local action, Codex proposes the exact base revision, branch, and worktree path, then asks once for approval to create them plus up to two local commits. The workflow then runs in this order:

1. Reuse the current Codex-managed or dedicated feature worktree, or create the approved CLI worktree and branch from the recorded base SHA.
2. Keep the original agent as orchestrator and explicitly use `$engineering:implement` for the feature.
3. Run the repository's required checks and create the authorized implementation commit.
4. Prefer a fresh project-scoped `engineering_reviewer`; otherwise spawn a fresh reviewer subagent. Explicitly instruct either reviewer to use `$engineering:review`.
5. Validate actionable findings, then have the original agent explicitly use `$engineering:fix-findings`.
6. Review the complete feature diff again with a fresh reviewer. Repeat until required reviewers return `CLEAN` or the bounded loop requires human input.
7. Add a separate read-only security, architecture, or migration review only when the changed risk makes it relevant.
8. Run final verification and create a review-fix commit when review produced code changes.

Each reviewer receives the worktree path, baseline and target revisions, acceptance criteria, repository guidance, verification evidence, complete diff, and prior finding dispositions. It reviews the full diff independently before reconciling earlier findings. Implementer conclusions are not passed as review evidence. Style preferences and unsupported speculation do not block completion.

One review round is one complete batch over the same HEAD: the general reviewer plus any security, architecture, or migration specialists required by the current risk. The default limit is five complete review rounds, not two; repeated or disputed findings are escalated instead of being silently closed.

Approval is scoped. Invoking `$engineering:delivery-loop` alone does not authorize worktree creation or commits; Codex asks once unless both were already authorized in the initial prompt. If worktree creation is declined, Codex does not silently continue in the current checkout. Push, merge, deploy, production mutation, worktree removal, and branch deletion always require separate authorization.

If the first independent review is already `CLEAN`, the implementation commit is the final code state and the workflow does not create an empty second commit. CLI-created and permanent feature worktrees remain available for inspection by default; Codex-managed worktree lifecycle stays under the desktop app.

## Optional repository guidance

`init` is optional. The plugin works without it. Run it when the repository needs a starter `AGENTS.md` and a project-scoped read-only `engineering_reviewer` agent:

```bash
npx nono-skills init
```

Without an explicit directory, initialization targets the current Git repository root. In a desktop multi-folder project, run it from the primary folder because Git operations and automatic discovery use that folder. Initialization creates:

- `AGENTS.md` for repository facts, commands, and conventions
- `.codex/agents/engineering-reviewer.toml` for independent read-only review

It does not pin the reviewer model or reasoning level, so the role inherits the user's current Codex configuration. Initialization no longer creates task artifacts. Existing 0.1.0 singleton files under `docs/agent/` are preserved and new durable work uses per-work-item directories.

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

Version 0.5.0 adds Codex-managed worktree reuse, five-round reviewer batches, project-scoped reviewer-agent setup, Git-root initialization, and Codex runtime and skill-metadata diagnostics. Version 0.4.0 replaced the old `engineering:review-loop` identifier with `$engineering:delivery-loop`; update saved prompts to use the explicit-only name.

Uninstall preserves project files. Remove only installer-owned project files that still match their installed checksums with:

```bash
npx nono-skills uninstall --purge-project /path/to/project
```

Modified project files are always preserved. Purge never removes user-owned `docs/agent/work/<work-id>/` directories.

## Moving away from Superpowers

Install this plugin, start a new task, and verify the `engineering:*` skills first. Then open `/plugins`, select Superpowers, and press Space to disable it reversibly. After normal work succeeds without it, uninstall Superpowers from the plugin browser. Do not delete Codex plugin cache directories manually.

This pack intentionally does not impose strict test-first enforcement, automatic worktrees, mandatory design approval gates, or general subagent-driven execution on normal engineering work. The focused `$engineering:delivery-loop` workflow is the exception: when explicitly invoked, it asks before creating an isolated worktree and uses fresh reviewer subagents with the dedicated review skill.

## Safety model

- The installer owns only the `engineering` plugin entry and source files recorded in its checksum manifest.
- Marketplace edits preserve unrelated entries and metadata.
- Install and update roll back plugin source and marketplace changes when Codex registration fails.
- Project files are never overwritten without `--force` and a backup.
- Codex-proposed durable workspaces require one explicit approval before creation; explicit artifact requests already provide consent for their scope.
- Delivery loop reuses an active Codex-managed worktree without nesting. New CLI worktrees require approval for the exact base, branch, and path and are preserved until separately authorized for removal.
- Work-item directories are user-owned, and uninstall purge never removes them.
- The CLI never disables or removes Superpowers automatically.

## Development

```bash
npm test
npm run validate
npm pack --dry-run
```

The runtime has no third-party dependencies.
