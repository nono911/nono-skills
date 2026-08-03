# Installation and maintenance

Nono Skills supports two installation paths. Use one path for the same host and scope to avoid duplicate skill names.

## Native Codex plugin

Requirements: Node.js 20 or newer and Codex plugin support.

```bash
npx nono-skills install
```

For repeatable environments, pin an exact npm version:

```bash
npx nono-skills@0.14.0 install
```

Start a new Codex task after install or update so refreshed definitions are loaded. Diagnose or maintain the installation with:

```bash
npx nono-skills doctor
npx nono-skills update
npx nono-skills uninstall
```

The installer owns only its plugin registration and checksum-recorded source files. Updates roll back installer-owned changes when registration fails. Uninstall preserves project files.

## Universal Agent Skills

```bash
npx skills@latest add nono911/nono-skills
```

The open `skills` CLI selects skills, supported agents, project or global scope, and copy or symlink mode. Install all 18 skills when using `delivery-loop` or `bugfix-loop` because those workflows compose companion skills.

Maintain this installation with:

```bash
npx skills list
npx skills update
npx skills remove
```

## Optional project initialization

```bash
npx nono-skills init
```

Without a path, initialization targets the current Git repository root. It proposes:

- `AGENTS.md` for repository facts, commands, conventions, and durable-workspace policy.
- `.codex/agents/engineering-reviewer.toml` for a project-scoped read-only reviewer.

Preview or target another repository:

```bash
npx nono-skills init --dry-run
npx nono-skills init ../my-project
```

Existing differing files are conflicts and are not written. `--force` creates timestamped backups before replacement. Initialization does not create feature specs or plans; those are proposed only when the work needs durable state or the user requests them.

## External local agents

External CLIs are optional collaborators, not an installation requirement and not the default.

```bash
npx nono-skills agents list
npx nono-skills agents setup
npx nono-skills agents doctor
npx nono-skills agents policy qwen isolated-writer
```

Setup records detected compatible providers as preferred and defaults them to `review-only`. It does not run an agent or share repository content. Every external execution still requires explicit provider, role, data-scope, worktree, timeout, and call-bound consent. Native agents or subagents remain the default when no external choice is made.

## Moving away from Superpowers

Install Nono Skills, start a new task, and verify the expected skills first. In Codex, disable Superpowers reversibly from the plugin browser before uninstalling it. Do not remove plugin cache directories manually.
