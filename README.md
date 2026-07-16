# Nono Skills

A lightweight, artifact-centered engineering workflow pack for Codex. It provides 15 namespaced skills without imposing Superpowers-style mandatory gates, worktree policy, or subagent orchestration.

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

## Initialize a project

Add durable repository guidance and shared agent artifacts to the current project:

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

Project artifacts include `AGENTS.md` and `docs/agent/` templates for specs, plans, decisions, findings, and handoffs.

## Maintain the installation

```bash
npx nono-skills doctor
npx nono-skills update
npx nono-skills uninstall
```

Uninstall preserves project files. Remove only project files that still match their installed checksums with:

```bash
npx nono-skills uninstall --purge-project /path/to/project
```

Modified project files are always preserved.

## Moving away from Superpowers

Install this plugin, start a new task, and verify the `engineering:*` skills first. Then open `/plugins`, select Superpowers, and press Space to disable it reversibly. After normal work succeeds without it, uninstall Superpowers from the plugin browser. Do not delete Codex plugin cache directories manually.

This pack intentionally does not reproduce strict test-first enforcement, automatic worktrees, mandatory design approval gates, or subagent-driven execution. Keep separate focused skills for those behaviors when you want them.

## Safety model

- The installer owns only the `engineering` plugin entry and source files recorded in its checksum manifest.
- Marketplace edits preserve unrelated entries and metadata.
- Install and update roll back plugin source and marketplace changes when Codex registration fails.
- Project files are never overwritten without `--force` and a backup.
- The CLI never disables or removes Superpowers automatically.

## Development

```bash
npm test
npm run validate
npm pack --dry-run
```

The runtime has no third-party dependencies.
