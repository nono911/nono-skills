# NPM Plugin Installer Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with test-first changes and verification after every task. This repository intentionally does not depend on Superpowers at runtime.

**Goal:** Build and locally verify an npm-executable installer for the namespaced `engineering` Codex plugin and its optional project artifacts.

**Architecture:** A dependency-free Node.js CLI dispatches focused command modules. Pure planning and state functions are separated from filesystem and subprocess adapters so tests can exercise conflicts, rollback, and ownership in temporary directories without touching the real Codex environment. The npm tarball owns a validated plugin bundle and project templates.

**Tech Stack:** Node.js 20+ ESM, built-in `node:test`, built-in filesystem/process/crypto APIs, Codex CLI 0.144.4-compatible plugin commands.

## Global Constraints

- Package name: `codex-engineering-skills`.
- Plugin name: `engineering`; skills surface as `engineering:*`.
- Runtime dependencies: none.
- Default plugin source: `~/plugins/engineering`.
- Default marketplace: `~/.agents/plugins/marketplace.json`.
- Never overwrite project artifacts by default.
- Never disable or uninstall Superpowers automatically.
- Never edit Codex config or cache directly.
- GitHub creation, push, and npm publication remain separate human-authorized gates.

---

### Task 1: Package shell and command dispatch

**Files:**
- Create: `package.json`
- Create: `bin/cli.js`
- Create: `src/cli.js`
- Create: `test/cli.test.js`

**Interfaces:**
- Produces: `parseArgs(argv) -> { command, target, force, dryRun, purgeProject, help, version }`
- Produces: `run(argv, context) -> Promise<number>` where `context` contains `stdout`, `stderr`, `env`, `cwd`, and command handlers.

- [ ] Write tests proving default help, unknown-command failure, `init [directory]`, `--force`, `--dry-run`, `--purge-project`, and version output.
- [ ] Run `node --test test/cli.test.js`; expect failure because `src/cli.js` does not exist.
- [ ] Implement the minimal argument parser and dispatcher. Keep `bin/cli.js` to a shebang, `run(process.argv.slice(2), context)`, and `process.exitCode` assignment.
- [ ] Run `node --test test/cli.test.js`; expect all Task 1 tests to pass.
- [ ] Run `npm pkg get name bin engines`; expect the package name, executable mapping, and Node floor.
- [ ] Commit with `feat(cli): add command dispatcher`.

### Task 2: Safe project initialization

**Files:**
- Create: `src/project-init.js`
- Create: `src/fs-safe.js`
- Create: `test/project-init.test.js`
- Create later through pack copy: `templates/AGENTS.md`
- Create later through pack copy: `templates/docs/agent/*.md`

**Interfaces:**
- Produces: `planProjectInit({ templateRoot, targetRoot, force, dryRun, clock }) -> Promise<Action[]>`.
- Produces: `applyProjectInit(actions) -> Promise<Result[]>`.
- `Action` is `{ type: 'create'|'skip'|'conflict'|'replace', source, destination, backup? }`.
- `replace` is emitted only with `force: true`; its backup path uses `.codex-engineering-skills-backup/<timestamp>/<relative-path>`.

- [ ] Write tests for missing-file creation, identical skip, differing-file conflict, dry-run with no writes, forced backup/replacement, and target paths containing spaces.
- [ ] Run `node --test test/project-init.test.js`; expect module-not-found failure.
- [ ] Implement SHA-256 comparison, deterministic action planning, parent creation, backup-before-replace, and result reporting.
- [ ] Run `node --test test/project-init.test.js`; expect all Task 2 tests to pass.
- [ ] Wire the `init` handler into `src/cli.js` and add one CLI integration test.
- [ ] Run `node --test test/cli.test.js test/project-init.test.js`; expect pass.
- [ ] Commit with `feat(init): add safe project artifact setup`.

### Task 3: Marketplace and ownership state

**Files:**
- Create: `src/plugin-state.js`
- Create: `test/plugin-state.test.js`

**Interfaces:**
- Produces: `readMarketplace(path) -> Promise<Marketplace|null>`.
- Produces: `upsertMarketplaceEntry(marketplace, entry) -> { marketplace, change }` preserving unrelated keys and entry order.
- Produces: `removeMarketplaceEntry(marketplace, pluginName) -> { marketplace, removed }`.
- Produces: `writeJsonAtomic(path, value) -> Promise<void>`.
- Produces: `createOwnershipManifest({ packageVersion, pluginVersion, marketplaceName, files })` with SHA-256 checksums.
- Produces: `verifyOwnership(manifest, root) -> Promise<{ valid, mismatches }>`.

- [ ] Write tests for a new personal marketplace, preservation of display metadata and unrelated entries, same-entry idempotency, foreign `engineering` conflict, removal of only the owned entry, atomic JSON replacement, and checksum mismatch reporting.
- [ ] Run `node --test test/plugin-state.test.js`; expect module-not-found failure.
- [ ] Implement pure marketplace transformations and atomic JSON/ownership helpers.
- [ ] Run `node --test test/plugin-state.test.js`; expect all Task 3 tests to pass.
- [ ] Commit with `feat(plugin): add marketplace ownership state`.

### Task 4: Plugin install and update transactions

**Files:**
- Create: `src/plugin-install.js`
- Create: `src/codex.js`
- Create: `test/plugin-install.test.js`
- Create: `test/fixtures/fake-codex.js`

**Interfaces:**
- Produces: `runCodex(args, options) -> Promise<{ code, stdout, stderr }>`.
- Produces: `installPlugin(context) -> Promise<InstallResult>`.
- Produces: `updatePlugin(context) -> Promise<InstallResult>`.
- `context` injects `home`, `packageRoot`, `runCodex`, and `clock`.
- Transaction order: preflight, stage source, snapshot marketplace/source, commit source and marketplace, run `codex plugin add`, verify, write ownership; on failure restore snapshots.

- [ ] Write tests for clean install, idempotent reinstall, foreign-plugin refusal, preservation of unrelated marketplace entries, missing Codex failure before mutation, subprocess failure rollback, verification failure rollback, and update version/cachebuster replacement.
- [ ] Run `node --test test/plugin-install.test.js`; expect module-not-found failure.
- [ ] Implement the subprocess adapter and transactional install/update using temporary sibling paths and atomic renames.
- [ ] Run `node --test test/plugin-install.test.js`; expect all Task 4 tests to pass.
- [ ] Wire `install` and `update` into the CLI and run the complete current suite.
- [ ] Commit with `feat(plugin): install and update engineering safely`.

### Task 5: Doctor and safe uninstall

**Files:**
- Create: `src/doctor.js`
- Create: `src/uninstall.js`
- Create: `test/doctor.test.js`
- Create: `test/uninstall.test.js`

**Interfaces:**
- Produces: `diagnose(context) -> Promise<Check[]>`, where `Check` is `{ name, status: 'pass'|'warn'|'fail', detail }`.
- Produces: `uninstallPlugin(context) -> Promise<UninstallResult>`.
- Produces: `purgeProject({ targetRoot, recordedChecksums }) -> Promise<PurgeResult>`; delete only exact checksum matches and leave modified files reported.

- [ ] Write doctor tests for version agreement, 15-skill count, missing manifest, checksum drift, unavailable Codex, and installed-status parsing.
- [ ] Run the doctor tests; expect module-not-found failure.
- [ ] Implement read-only checks and deterministic human-readable/JSON-ready results.
- [ ] Write uninstall tests for Codex removal, owned entry/source cleanup, foreign or drifted source refusal, project preservation, and checksum-gated purge.
- [ ] Run the uninstall tests; expect module-not-found failure.
- [ ] Implement uninstall and purge with ownership checks before every deletion.
- [ ] Wire `doctor` and `uninstall` into the CLI; run all tests.
- [ ] Commit with `feat(plugin): add diagnostics and safe uninstall`.

### Task 6: Plugin bundle and project templates

**Files:**
- Create with plugin scaffold: `plugin/.codex-plugin/plugin.json`
- Copy from validated pack: `plugin/skills/*/SKILL.md`
- Copy from validated pack: `plugin/skills/*/agents/openai.yaml`
- Copy from validated pack: `templates/AGENTS.md`
- Copy from validated pack: `templates/docs/agent/*.md`
- Create: `test/bundle.test.js`

**Interfaces:**
- Plugin manifest declares `name: engineering`, strict semver, author metadata, `skills: ./skills/`, and required interface fields.
- Bundle test exports no API; it validates package-owned artifacts and counts exactly 15 skills.

- [ ] Write bundle tests for required plugin fields, strict version agreement with `package.json`, exact 15-skill set, valid skill frontmatter, absence of TODO/Superpowers runtime references, and presence of every project template.
- [ ] Run `node --test test/bundle.test.js`; expect failure because the plugin bundle is absent.
- [ ] Scaffold `engineering` with the plugin creator, then replace scaffold placeholders with final metadata.
- [ ] Copy the already validated pack files into `plugin/skills/` and `templates/` using formatting/copy commands without changing their content.
- [ ] Run the plugin validator, all skill validators, and `node --test test/bundle.test.js`; expect pass.
- [ ] Commit with `feat(skills): bundle engineering plugin and templates`.

### Task 7: Package documentation and isolated release verification

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `.gitignore`
- Create: `test/package.test.js`
- Modify: `package.json`

**Interfaces:**
- README documents install, new-task activation, `init`, update, doctor, uninstall, disabling Superpowers separately, and recovery.
- `npm test` runs all tests; `npm run validate` validates package and plugin artifacts.

- [ ] Write package tests that inspect `npm pack --json --dry-run` for the CLI, source, plugin, templates, README, and license while excluding tests, design docs, ownership state, backups, and secrets.
- [ ] Run `node --test test/package.test.js`; expect failure until package file rules and docs exist.
- [ ] Add package files, scripts, keywords, repository placeholder-free metadata, MIT license, and user documentation.
- [ ] Run `npm test`, `npm run validate`, `npm pack --json`, and inspect the tarball contents and executable mode.
- [ ] Against an isolated temporary `HOME` and fake or sandboxed Codex state, run `install`, `doctor`, `init --dry-run`, `init`, `update`, and `uninstall`; expect no writes outside the isolated paths.
- [ ] Run a final diff review, placeholder scan, secret scan, and `git status` check.
- [ ] Commit with `docs: add package usage and release verification`.

## Final local handoff

- [ ] Report exact test, validator, package, and smoke-test evidence.
- [ ] Confirm the local repository is ready before asking for GitHub owner/visibility and npm author/auth details.
- [ ] Do not create the remote repository, push, disable Superpowers, or publish npm until those external actions are explicitly confirmed after verification.

