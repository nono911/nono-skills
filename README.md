# Nono Skills

Evidence-driven engineering loops and reusable Agent Skills for Codex, Claude Code, Gemini CLI, Cursor, GitHub Copilot, Hermes Agent, and other Agent Skills hosts. Nono Skills is a lightweight Superpowers alternative covering planning, implementation, testing, browser QA, code review, bug fixing, security, and release readiness.

The pack is designed for capable reasoning models such as GPT-5.6 Sol. Skills define intent and guardrails while leaving implementation strategy to the model. They do not impose mandatory design or implementation approval gates, worktrees, test-first development, or subagent orchestration unless the user explicitly invokes `delivery-loop` or `bugfix-loop`. Outside those focused workflows, the only built-in gate is consent before the agent creates a durable workspace that the user did not explicitly request.

## How it works

- Install once, start a new agent task, and ask for engineering work naturally. Explicit invocation remains optional except for the intentionally explicit-only `delivery-loop` and `bugfix-loop`.
- Small tasks stay artifact-free.
- For work worth resuming or tracking, the agent proposes an isolated `docs/agent/work/<work-id>/` workspace and asks once before creating it.
- An explicit request for a spec, plan, log, findings tracker, handoff, or named existing work item already grants artifact consent for that scope.
- After approval, the agent maintains that work item's spec, plan, material decisions, findings, and handoff as needed without asking for every file update.
- The agent asks again only for an ambiguous work-item match, material scope expansion, or an action that needs new authority.

## Engineering loop model

- `delivery-loop` is the engineering loop for delivering new features through implementation, verification, independent review, and remediation.
- `bugfix-loop` is the engineering loop for proving and fixing existing defects with regression evidence and independent review.
- `acceptance-verify` is the source-read-only QA gate for validating real user journeys with browser and runtime evidence.
- The remaining skills are focused capabilities that can be used independently or composed by a loop when their expertise is needed.

Together they cover plan → implement → test → QA → review → fix → release without forcing every task through a heavyweight workflow.

## Install

### Universal Agent Skills

Use the open `skills` CLI to choose which skills to install, which supported agents receive them, project or global scope, and symlink or copy mode:

```bash
npx skills@latest add nono911/nono-skills
```

The repository is discovered as 18 self-contained Agent Skills. Each installed skill carries its own workspace reference and resolves companion skills by frontmatter name through the current host's native invocation mechanism. Install the complete pack when using `delivery-loop` or `bugfix-loop` so their companion implementation, QA, test, review, and remediation skills are available.

Non-interactive examples:

```bash
# Install every skill to every detected agent
npx skills@latest add nono911/nono-skills --all

# Install every skill globally for selected agents
npx skills@latest add nono911/nono-skills --skill '*' --agent codex --agent claude-code --agent gemini-cli --global --yes
```

The universal path supports every host recognized by the `skills` CLI, including Codex, Claude Code, Gemini CLI, Cursor, GitHub Copilot, and Hermes Agent. A loop requires a fresh isolated reviewer agent or subagent to claim an independently clean result. When the host cannot provide one, it asks before editing whether to switch to ordinary implementation with disclosed non-independent self-review or stop; the degraded path never reports `CLEAN`.

### Native Codex plugin

Use the npm installer when you want the managed `engineering:*` Codex plugin, native plugin updates and diagnostics, and the optional Codex reviewer-agent template. Requires Node.js 20 or newer and Codex with plugin support; Codex CLI 0.145.0 or newer is recommended.

```bash
npx nono-skills install
```

The optional local-agent bridge needs no additional skill installation. It
currently provides reviewed adapters for Claude Code, OpenAI Codex, Qwen Code,
OpenCode, and CodeWhale. Google Antigravity is detected for diagnostics but its
TUI is not automated; the official SDK remains the future programmatic path.
Inspect compatible CLIs, persist preferred providers, or diagnose enabled
providers with:

```bash
npx nono-skills agents list
npx nono-skills agents setup
npx nono-skills agents doctor
npx nono-skills agents policy qwen isolated-writer
```

`agents setup` records detected compatible providers as preferred and defaults
each one to `review-only`; it is optional and never changes the Native-subagent
default. Use `agents policy <name>
isolated-writer` only when you want that provider to be eligible for implementation
after you explicitly select an external execution path. Detection and setup never
start an agent or share repository content. `delivery-loop` still states the harness, underlying
provider/model when discoverable, role, source scope, worktree, call limit,
timeout, and budget, then obtains explicit consent for each run. Use
`npx nono-skills agents disable claude` to exclude Claude Code from proposals.

Choose one installation path for the same agent and scope. Installing both the universal standalone skills and native Codex plugin can expose duplicate skill names.

Then work normally:

```text
Implement user authentication and keep me updated.
```

For a durable task, the agent may propose:

```text
This work has multiple stages and should remain resumable. I propose
docs/agent/work/2026-07-16-user-auth/ for its spec, plan, and material
decisions. Approve this workspace?
```

Declining keeps the work in the current conversation and creates no workflow files.

With the native Codex plugin, skills appear under the `engineering` namespace:

```text
$engineering:plan
$engineering:implement
$engineering:review
$engineering:acceptance-verify
$engineering:delivery-loop
$engineering:bugfix-loop
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
| Explore options before choosing a direction | `brainstorm` |
| Turn defined work into a verifiable execution map | `plan` |
| Build a general software change | `implement` |
| Correct validated findings | `fix-findings` |
| Review a change without editing it | `review` |
| QA a real user journey with browser and runtime evidence | `acceptance-verify` |
| Deliver in an approved worktree through independent review | `delivery-loop` |
| Prove and fix a bug with regression evidence and independent review | `bugfix-loop` |
| Assess security as the primary objective | `security-review` |
| Evaluate system structure and change cost | `architecture-review` |
| Isolate a root cause from runtime evidence | `debug` |
| Add focused behavioral or regression tests | `test` |
| Improve internal structure without changing behavior | `refactor` |
| Assess merge, release, or deployment readiness | `release-readiness` |
| Estimate effort with ranges and uncertainty | `estimate` |
| Design a reversible transition | `migration` |
| Design a stable consumer contract | `api-design` |
| Design persistent data around invariants | `database-design` |

Universal installations expose these frontmatter names through each host's own skill syntax and any namespace assigned by that host. Use the name shown in the agent's skill list rather than assuming the native Codex `$engineering:` prefix.

## QA acceptance verification

Activate `acceptance-verify` through the current host to test a running user journey against explicit acceptance criteria. It behaves like an evidence-driven QA specialist: it interacts with the UI, inspects rendered state, correlates relevant console and network failures, and reports `PASSED`, `FAILED`, or `BLOCKED` per scenario. The example uses the native Codex namespace:

```text
$engineering:acceptance-verify

QA the staging checkout flow as a customer.

Acceptance criteria:
- a valid card creates one order and reaches confirmation
- a declined card shows an inline error and creates no order
- refreshing confirmation does not submit payment again

Use disposable test data. Do not send real charges.
```

The report identifies the environment, build when known, account role, viewport, scenario status, reproduction steps, and sanitized screenshots or runtime evidence. A failed scenario is retried once from a clean state when safe; an observed intermittent defect remains `FAILED` and includes its reproduction rate.

The skill is source-read-only. It does not edit code, create a worktree, commit, or start a nested fix loop. For QA-only requests it returns the report. When a request also authorizes remediation, the original orchestrator uses the evidence with `delivery-loop` for incomplete feature behavior or `bugfix-loop` for a defect with expected existing behavior.

For UI criteria, API success, source inspection, automated test output, or reviewer opinion alone cannot produce a pass. Production interaction, real money, outbound messages, destructive actions, permission changes, or sensitive data require separate explicit authority.

## Isolated delivery loop

Activate `delivery-loop` when a feature should be isolated in a Git worktree, implemented, independently reviewed, and remediated before it is considered complete. This workflow is explicit-only and is not selected automatically. The example uses the native Codex namespace. Native host agents remain the default; compatible local agent CLIs are optional collaborators when provider diversity or an independent work split materially helps.

When the current host already provides an isolated worktree, start there when practical; the workflow reuses that host-managed worktree and never creates a nested one. Otherwise, start from the intended base checkout and invoke the skill explicitly. The current local checkout may contain unrelated changes because a separately approved feature worktree isolates them:

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

You still invoke only `delivery-loop`; there is no separate skill for Claude,
Codex, Qwen, OpenCode, or CodeWhale. For example, add `Use Qwen Code only as a
read-only reviewer` or `Split independent implementation across eligible agents,
with at most two external calls` when you want a specific policy. Otherwise the
orchestrator uses fresh native agents or subagents from the current host and does
not probe or propose external providers.

When the task already runs in a host-managed worktree, the agent reuses it and requests only missing commit authority. Otherwise, unless the initial prompt already authorizes every local action, the agent proposes the exact base revision, branch, and worktree path, then asks once for approval to create them plus up to two local commits. That approval includes these agent-execution choices:

1. `Native subagents (default)` — use fresh agents or subagents from the current host.
2. `External CLI agents` — select a compatible local provider, then confirm its source scope and per-run consent.
3. `Hybrid` — keep native orchestration and add approved external reviewers or isolated writers.

If the user approves without choosing, the workflow uses Native subagents. It
does not infer external consent from an installed or enabled provider. The
workflow then runs in this order:

1. Reuse the current host-managed or dedicated feature worktree, or create the approved Git CLI worktree and branch from the recorded base SHA.
2. For multi-step work, activate the companion `plan` skill before implementation. Keep it in the conversation unless a durable workspace is approved; do not create planning artifacts for a small well-defined feature.
3. Use native subagents by default. Only after the user selects External or Hybrid, probe optional agent CLIs locally with version, help, and documented offline capability checks, then propose bridge-reported roles and obtain any missing provider, data-sharing, call-budget, and child-worktree consent.
4. Keep the original agent as orchestrator and activate the companion `implement` skill for the feature. Read-only delegates may work in parallel; write delegates receive disjoint ownership and separate approved child worktrees.
5. Inspect every delegated result, reject out-of-scope changes, integrate accepted work, and run the repository's required checks before creating the authorized implementation commit.
6. Use a fresh project-scoped reviewer agent or fresh reviewer subagent and instruct it to activate the companion `review` skill. An approved external reviewer may join or fill this role only with fresh, read-only context. If independent review becomes unavailable, stop rather than substituting self-review or claiming `CLEAN`.
7. Validate actionable findings, then have the original agent activate the companion `fix-findings` skill.
8. Review the complete feature diff again with a fresh reviewer. Repeat until required reviewers return `CLEAN` or the bounded loop requires human input.
9. Add a separate read-only security, architecture, or migration review only when the changed risk makes it relevant.
10. Run final verification and create one review-fix commit when any validated post-implementation fix changed code and the resulting state passed fresh review.

Each reviewer receives the worktree path, baseline and target revisions, acceptance criteria, repository guidance, verification evidence, complete diff, and prior finding dispositions. It reviews the full diff independently before reconciling earlier findings. Implementer conclusions are not passed as review evidence. Style preferences and unsupported speculation do not block completion.
Reviewer agents return findings and proposed decision-log records to the original orchestrator; they never edit code or durable workspace artifacts themselves.

One review round is one complete batch over the same HEAD: the general reviewer plus any security, architecture, or migration specialists required by the current risk. The default limit is five complete review rounds, not two; repeated or disputed findings are escalated instead of being silently closed.

Approval is scoped. Invoking `delivery-loop` alone does not authorize worktree creation, commits, or sharing source with an external provider; the agent asks once unless those exact actions were already authorized in the initial prompt. Enabling a provider is never consent to run it. If required worktree creation is declined, the loop ends; the agent may offer ordinary implementation in the current checkout only with separate write and commit authority. Push, merge, deploy, production mutation, worktree removal, and branch deletion always require separate authorization.

Every adapter must provide a noninteractive permission boundary and return the
same validated task identity and result contract. Claude Code receives scoped
file tools and no shell; Codex uses its native read-only or workspace-write
sandbox; Qwen Code uses safe mode, sandboxing, excluded shell/web/subagent tools,
and native budgets; OpenCode uses pure mode and deny-by-default inline
permissions; CodeWhale requires a doctor-reported OS sandbox, disables shell,
clamps nested-agent concurrency, and explicitly forbids further delegation in
the task contract. The original orchestrator owns official verification, Git,
integration, and commits.

The loop never invokes Claude Code from a Claude Code host task—or any provider
from a task owned by the same harness. A failed or malformed external result is
rejected rather than treated as `CLEAN`. If an external provider implemented any
part of the feature, it may supplement review but cannot be the sole general
reviewer. Review independence tracks the harness, underlying provider/model, and
fresh session; changing only the CLI wrapper does not create model diversity.

If the first independent review is already `CLEAN`, the implementation commit is the final code state and the workflow does not create an empty second commit. Git CLI-created and permanent feature worktrees remain available for inspection by default; host-managed worktree lifecycle stays under the host.

## Isolated bugfix loop

Activate `bugfix-loop` when a defect should be reproduced, traced to a supported root cause, regression-protected, minimally fixed, and independently reviewed before completion. This workflow is explicit-only and is not selected automatically for ordinary diagnosis or implementation.

It uses the same host-managed, dedicated, or approved Git CLI worktree rules and the same two-local-commit authority boundary as `delivery-loop`. The bug-specific sequence is:

1. Activate the companion `debug` skill to reproduce the symptom and support the causal chain before changing production code.
2. Activate the companion `test` skill to create the smallest stable regression proof and confirm it fails for the expected pre-fix reason.
3. Activate the companion `implement` skill for the minimal compatible root-cause fix.
4. Re-run the regression proof, original reproduction when safe, and adjacent verification; then create the authorized bugfix commit.
5. Run a fresh read-only companion `review` batch over the complete diff.
6. Validate findings and activate the companion `fix-findings` skill; verify before starting the next fresh batch.
7. Stop when the required reviewers return `CLEAN`, or escalate after at most five sequential review rounds.
8. Create one consolidated review-fix commit only when validated post-implementation fixes changed code and the resulting state passed fresh review and final verification.

Review rounds are never launched five times in advance. Each round completes against one HEAD, then any findings are validated, fixed, and verified before the next round begins. If round five still finds an actionable defect, the original agent may safely fix and verify it within existing authority, but it stops without claiming a clean loop or creating the final fix commit because a sixth independent review needs new direction.

Example:

```text
$engineering:bugfix-loop

Checkout sometimes loses the authenticated session after refresh.
Expected: the session remains valid for 24 hours.
Do not push.
```

If the symptom cannot be reproduced safely or no pre-fix failure can be demonstrated, the workflow discloses the evidence gap and escalates before committing a claimed fix. Push, merge, deploy, production mutation, worktree removal, and branch deletion remain separately authorized actions.

## Optional native Codex repository guidance

`init` is optional and belongs to the native Codex installer. The skills work without it. Run it when the repository needs a starter `AGENTS.md` and a project-scoped read-only `engineering_reviewer` agent:

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

## Maintain installations

For universal Agent Skills:

```bash
npx skills list
npx skills update
npx skills remove
```

For the native Codex plugin:

```bash
npx nono-skills doctor
npx nono-skills agents doctor
npx nono-skills update
npx nono-skills uninstall
```

Start a new Codex task after install or update so the refreshed skill definitions are loaded.

Version 0.9.0 makes delivery native-first, adds Native, External, and Hybrid approval choices, and introduces bounded adapters for Claude Code, OpenAI Codex, Qwen Code, OpenCode, and CodeWhale. Version 0.8.0 makes all 18 skills self-contained for `npx skills`, resolves companion skills through each host's native mechanism, and replaces Codex-only loop assumptions with capability-aware host-managed worktrees and reviewer agents. Version 0.7.0 added `$engineering:acceptance-verify` for source-read-only QA, browser evidence, strict scenario verdicts, and conditional composition with delivery and bugfix workflows. Version 0.6.0 added the explicit-only `$engineering:bugfix-loop` for evidence-first diagnosis, pre-fix regression proof, minimal remediation, and up to five sequential independent review rounds. Version 0.5.0 added Codex-managed worktree reuse, five-round reviewer batches, project-scoped reviewer-agent setup, Git-root initialization, and Codex runtime and skill-metadata diagnostics. Version 0.4.0 replaced the old `engineering:review-loop` identifier with `$engineering:delivery-loop`; update saved prompts to use the explicit-only name.

Uninstall preserves project files. Remove only installer-owned project files that still match their installed checksums with:

```bash
npx nono-skills uninstall --purge-project /path/to/project
```

Modified project files are always preserved. Purge never removes user-owned `docs/agent/work/<work-id>/` directories.

## Moving away from Superpowers

For native Codex, install this plugin, start a new task, and verify the `engineering:*` skills first. Then open `/plugins`, select Superpowers, and press Space to disable it reversibly. After normal work succeeds without it, uninstall Superpowers from the plugin browser. Do not delete Codex plugin cache directories manually.

This pack intentionally does not impose strict test-first enforcement, automatic worktrees, mandatory design approval gates, or general subagent-driven execution on normal engineering work. The focused `delivery-loop` and `bugfix-loop` workflows are exceptions: when explicitly invoked, they ask before creating an isolated worktree and use fresh reviewer agents with the dedicated review skill.

## Safety model

- Universal installs are managed by the open `skills` CLI in the selected host paths; native Codex installs are managed by `nono-skills`.
- The native installer owns only the `engineering` plugin entry and source files recorded in its checksum manifest.
- Marketplace edits preserve unrelated entries and metadata.
- Install and update roll back plugin source and marketplace changes when Codex registration fails.
- Project files are never overwritten without `--force` and a backup.
- Agent-proposed durable workspaces require one explicit approval before creation; explicit artifact requests already provide consent for their scope.
- Delivery loop reuses an active host-managed worktree without nesting. New Git CLI worktrees require approval for the exact base, branch, and path and are preserved until separately authorized for removal.
- External-agent discovery uses only local version and capability probes. Every external run requires fresh consent for provider, role, data scope, worktree, and call or budget bounds; write workers never receive shell or Git authority.
- Provider setup defaults to `review-only`. An `isolated-writer` policy makes implementation eligible for proposal but never replaces per-run consent or child-worktree isolation.
- Bugfix loop applies the same isolation and authority rules, requires pre-fix evidence, and never treats unreviewed round-five fixes as a clean result.
- Acceptance verification stays source-read-only, uses the least privileged suitable test identity, and requires new authority before risky external actions.
- Work-item directories are user-owned, and uninstall purge never removes them.
- The CLI never disables or removes Superpowers automatically.

## Development

```bash
npm test
npm run sync:portable
npm run validate
npm pack --dry-run
```

Run `npm run sync:portable` after changing the canonical workspace protocol so every self-contained skill receives the same reference. The runtime has no third-party dependencies.
