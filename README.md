# Nono Skills

A lightweight, reasoning-first engineering workflow pack for Codex. It provides 15 namespaced skills built around outcomes, evidence, verification, material decisions, and human escalation.

The pack is designed for capable reasoning models such as GPT-5.6 Sol. Skills define intent and guardrails while leaving implementation strategy to the model. They do not impose mandatory approval gates, worktrees, test-first development, or subagent orchestration.

## How it works

- Codex can select a skill implicitly from its focused trigger description, or you can invoke one explicitly.
- Each skill defines its purpose, inputs, outputs, rules, decision-log updates, and conditions that require human judgment.
- Workflow artifacts are optional. Skills update existing artifacts but do not create missing `docs/agent/` files unless you request durable artifacts or run `init`.
- Decision logs capture costly, contractual, ambiguous, or risk-bearing choices—not routine edits or shell commands.
- Overlapping intents have explicit boundaries: brainstorm before direction, plan after direction, implement general changes, fix-findings for validated findings, review for general defects, and security-review when security is the primary objective.

## Install

Requires Node.js 20 or newer and Codex CLI with plugin support.

```bash
npx nono-skills install
```

Start a new Codex task after installation. Skills appear under the `engineering` namespace:

```text
$engineering:plan
$engineering:implement
$engineering:review
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

## Initialize a project

Initialization is optional. Add concise repository guidance and shared agent artifacts to the current project with:

```bash
npx nono-skills init
```

Preview changes or target another repository:

```bash
npx nono-skills init --dry-run
npx nono-skills init ../my-project
```

Existing differing files are reported as conflicts and no files are written. To replace them explicitly, create timestamped backups first:

```bash
npx nono-skills init --force
```

Project artifacts include a repository-focused `AGENTS.md` and `docs/agent/` templates for specs, plans, decisions, findings, and handoffs. Without initialization, skills return the same material information in their final response instead of creating workflow files.

## Maintain the installation

```bash
npx nono-skills doctor
npx nono-skills update
npx nono-skills uninstall
```

Start a new Codex task after install or update so the refreshed skill definitions are loaded.

Uninstall preserves project files. Remove only project files that still match their installed checksums with:

```bash
npx nono-skills uninstall --purge-project /path/to/project
```

Modified project files are always preserved.

## Moving away from Superpowers

Install this plugin, start a new task, and verify the `engineering:*` skills first. Then open `/plugins`, select Superpowers, and press Space to disable it reversibly. After normal work succeeds without it, uninstall Superpowers from the plugin browser. Do not delete Codex plugin cache directories manually.

This pack intentionally does not reproduce strict test-first enforcement, automatic worktrees, mandatory design approval gates, or subagent-driven execution. Add separate focused skills for those behaviors when a task genuinely needs them.

## Safety model

- The installer owns only the `engineering` plugin entry and source files recorded in its checksum manifest.
- Marketplace edits preserve unrelated entries and metadata.
- Install and update roll back plugin source and marketplace changes when Codex registration fails.
- Project files are never overwritten without `--force` and a backup.
- Skills do not create missing workflow artifacts implicitly.
- The CLI never disables or removes Superpowers automatically.

## Development

```bash
npm test
npm run validate
npm pack --dry-run
```

The runtime has no third-party dependencies.
