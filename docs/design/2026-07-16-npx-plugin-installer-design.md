# NPM Installer and Codex Plugin Design

Date: 2026-07-16
Status: proposed for implementation

## Goal

Publish the engineering skills pack as an npm-executable installer so a user can install, update, diagnose, and remove a namespaced Codex plugin without manually copying files or editing Codex state.

Primary command:

```bash
npx codex-engineering-skills install
```

Installed skills are invoked as `$engineering:plan`, `$engineering:implement`, `$engineering:review`, and the remaining `engineering:*` skills. This avoids collisions with existing global or repository skills such as the currently installed unnamespaced `implement` skill.

## Scope

### Included

- An npm package named `codex-engineering-skills` with a Node.js CLI and no runtime dependencies where practical.
- A Codex plugin named `engineering` containing the 15 validated skills.
- Project artifact templates: `AGENTS.md`, `docs/agent/spec.md`, `plan.md`, `decision-log.md`, `findings.md`, and `handoff.md`.
- Safe install, update, project initialization, doctor, and uninstall commands.
- Automated tests for filesystem behavior, conflicts, idempotency, rollback, and packaged contents.
- Local package and plugin validation before any external publication.

### Excluded

- Automatic removal or disabling of Superpowers.
- Silent modification of existing project `AGENTS.md` or agent artifacts.
- Automatic npm publication, GitHub repository creation, push, or release without a final explicit authorization after local verification.
- Recreating Superpowers hard gates, hooks, worktree management, or subagent orchestration.

## Repository layout

```text
codex-engineering-skills/
├── package.json
├── LICENSE
├── README.md
├── bin/
│   └── cli.js
├── src/
│   ├── commands/
│   │   ├── install.js
│   │   ├── init.js
│   │   ├── update.js
│   │   ├── doctor.js
│   │   └── uninstall.js
│   └── lib/
│       ├── filesystem.js
│       ├── marketplace.js
│       └── codex.js
├── plugin/
│   ├── .codex-plugin/plugin.json
│   └── skills/<skill>/SKILL.md
├── templates/
│   ├── AGENTS.md
│   └── docs/agent/*.md
├── test/
└── docs/design/
```

## Command contract

### `install`

1. Preflight Node.js, filesystem permissions, Codex CLI availability, and existing plugin/marketplace state.
2. Copy the bundled `engineering` plugin to `~/plugins/engineering`, the source resolved by the default personal marketplace entry.
3. Create or update only the `engineering` entry in the personal marketplace while preserving unrelated entries and display metadata.
4. Run `codex plugin add engineering@<personal-marketplace-name>`.
5. Verify the plugin appears installed and tell the user to start a new Codex task.

Installation must be idempotent. Existing owned files from another version are updated atomically. Unrecognized files or conflicting marketplace ownership stop the command with recovery instructions.

### `init [directory]`

Copy project artifacts to the target repository. Default target is the current directory. Existing files are never overwritten by default.

- Missing files are created.
- Identical files are reported and skipped.
- Different files produce a conflict report.
- `--force` is explicit and creates a timestamped backup before replacement.
- `--dry-run` reports all intended changes without writing.

The plugin skills remain globally installed; `init` installs only repository guidance and shared task artifacts.

### `update`

Update the owned plugin source, replace the Codex cachebuster, reinstall through the configured personal marketplace, and preserve user project artifacts. Refuse to update an installation whose manifest or marketplace ownership cannot be established.

### `doctor`

Report Node and Codex versions, personal marketplace state, plugin source integrity, installed/enabled status, package/plugin version agreement, skill count, conflicting names, and whether a new task is required. It performs no writes.

### `uninstall`

Remove the installed `engineering` plugin through the Codex CLI, remove only the marketplace entry and plugin source owned by this package, and preserve all project artifacts by default. `--purge-project <directory>` is a separate explicit action and removes only files whose content still matches a recorded installed checksum.

## State and ownership

The installer writes `~/plugins/engineering/.installer-state.json` containing installer version, plugin version, installed paths, checksums, and marketplace identity. Every update or removal checks this manifest before mutation.

Marketplace updates to `~/.agents/plugins/marketplace.json` use parse-modify-write with an atomic temporary file and rollback snapshot. The installer never rewrites unrelated entries and never edits Codex config or cache state directly.

## Error handling

- Preflight failures produce no writes.
- Partial installation restores the marketplace snapshot and previous plugin source.
- Missing `codex` stops plugin registration but leaves a clear remediation path; it is not reported as success.
- Existing non-owned `engineering` plugin or marketplace entry is a hard conflict.
- Permission, malformed JSON, incompatible Codex CLI, and subprocess failures include the failed step and safe recovery command.
- No command removes or disables Superpowers automatically.

## Verification

Automated tests use temporary home and project directories plus a fake Codex executable. They cover:

- clean installation and idempotent reinstall
- preservation of unrelated marketplace entries
- atomic rollback after each simulated failure point
- conflict with an existing non-owned plugin
- project init, identical-file skip, conflict, dry-run, backup, and force behavior
- update ownership and version checks
- uninstall preservation and checksum-gated purge
- paths containing spaces and supported macOS/Linux path behavior
- npm package contents and executable permissions
- validation of all 15 skills and the plugin manifest

Manual smoke test after packing:

1. `npm pack`
2. Install the tarball against an isolated temporary home.
3. Run `install`, `doctor`, `init --dry-run`, `init`, `update`, and `uninstall`.
4. Install locally in the real Codex environment only after isolated tests pass.
5. Start a new task and verify `engineering:*` skills appear before disabling Superpowers.

## Release gates

Local completion requires tests, package inspection, plugin validation, clean install/update/uninstall smoke tests, and a documented rollback path.

Creating the public GitHub repository, pushing, and publishing the npm package are separate external actions. Before those actions, confirm repository owner, package author metadata, license, Git identity, npm authentication, and public visibility with the human.
