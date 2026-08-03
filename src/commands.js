import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { runCodex as defaultRunCodex } from './codex.js';
import { diagnose } from './doctor.js';
import { listFiles, sha256File } from './fs-safe.js';
import { installPlugin, updatePlugin } from './plugin-install.js';
import { writeJsonAtomic } from './plugin-state.js';
import { applyProjectInit, planProjectInit, resolveProjectTarget } from './project-init.js';
import { assertSkillEvalCorpus, loadSkillEvalCorpus, scoreSkillEvalResults } from './skill-eval.js';
import { purgeProject, uninstallPlugin } from './uninstall.js';
import {
  listAgentProviders as defaultListAgentProviders,
  setAgentProviderEnabled as defaultSetAgentProviderEnabled,
  setAgentProviderPolicy as defaultSetAgentProviderPolicy,
} from '../plugin/skills/delivery-loop/scripts/agent-bridge.mjs';
import {
  listRuns as defaultListRuns,
  purgeRepositoryEvidence as defaultPurgeRepositoryEvidence,
  repositoryInsights as defaultRepositoryInsights,
  showRun as defaultShowRun,
  supersedeLegacyRun as defaultSupersedeLegacyRun,
} from '../plugin/runtime/loop-controller.mjs';

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function timestamp() {
  return new Date().toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function createHandlers(base) {
  const stdout = base.stdout ?? process.stdout;
  const stderr = base.stderr ?? process.stderr;
  const runCodex = base.runCodex ?? defaultRunCodex;
  const removePlugin = base.uninstallPlugin ?? uninstallPlugin;
  const agentBridge = base.agentBridge ?? {
    listAgentProviders: defaultListAgentProviders,
    setAgentProviderEnabled: defaultSetAgentProviderEnabled,
    setAgentProviderPolicy: defaultSetAgentProviderPolicy,
  };
  const loopController = base.loopController ?? {
    listRuns: defaultListRuns,
    showRun: defaultShowRun,
    supersedeLegacyRun: defaultSupersedeLegacyRun,
    repositoryInsights: defaultRepositoryInsights,
    purgeRepositoryEvidence: defaultPurgeRepositoryEvidence,
  };
  const agentContext = () => ({
    home: base.home,
    runCommand: base.runExternalCommand,
  });
  const pluginContext = () => ({
    home: base.home,
    packageRoot: base.packageRoot,
    packageVersion: base.packageVersion,
    runCodex,
    clock: base.clock ?? timestamp,
  });

  return {
    async install() {
      const result = await installPlugin(pluginContext());
      stdout.write(`Engineering plugin ${result.status} (${result.pluginVersion}). Start a new Codex task to activate it.\n`);
      stdout.write('Optional local agents: run npx nono-skills agents list.\n');
      return 0;
    },

    async update() {
      const result = await updatePlugin(pluginContext());
      stdout.write(`Engineering plugin ${result.status} (${result.pluginVersion}). Start a new Codex task to activate it.\n`);
      stdout.write('Optional local agents: run npx nono-skills agents list.\n');
      return 0;
    },

    async init(options) {
      const targetRoot = await resolveProjectTarget({
        cwd: base.cwd,
        target: options.target,
        findRoot: base.findGitRoot,
      });
      const templateRoot = path.join(base.packageRoot, 'templates');
      const actions = await planProjectInit({
        templateRoot, targetRoot, force: options.force, dryRun: options.dryRun, clock: base.clock ?? timestamp,
      });
      const conflicts = actions.filter((action) => action.type === 'conflict');
      if (conflicts.length) {
        stderr.write(`Conflicts detected; no files written:\n${conflicts.map((action) => `- ${action.relative}`).join('\n')}\nUse --force to back up and replace them.\n`);
        return 1;
      }
      const results = await applyProjectInit(actions);
      if (!options.dryRun) {
        const files = await listFiles(templateRoot);
        const checksums = {};
        for (const relative of files) checksums[relative] = await sha256File(path.join(targetRoot, relative));
        await writeJsonAtomic(path.join(targetRoot, '.codex-engineering-skills.json'), {
          schemaVersion: 1, packageVersion: base.packageVersion, files: checksums,
        });
      }
      const count = (type) => results.filter((result) => result.type === type).length;
      stdout.write(`Target: ${targetRoot}\n`);
      stdout.write(`${options.dryRun ? 'Would create' : 'Created'} ${count('create')}, replaced ${count('replace')}, skipped ${count('skip')}.\n`);
      return 0;
    },

    async doctor() {
      const checks = await diagnose({ home: base.home, packageVersion: base.packageVersion, runCodex });
      for (const check of checks) stdout.write(`${check.status.toUpperCase()} ${check.name}: ${check.detail}\n`);
      return checks.some((check) => check.status === 'fail') ? 1 : 0;
    },

    async agents(options) {
      const providers = await agentBridge.listAgentProviders(agentContext());
      const provider = options.provider
        ? providers.find((candidate) => candidate.name === options.provider)
        : undefined;

      if (options.agentCommand === 'enable') {
        if (!provider) throw new Error(`Unsupported external agent provider: ${options.provider}`);
        if (!provider.available) throw new Error(`${provider.displayName} is unavailable: ${provider.detail}`);
        if (!provider.compatible) throw new Error(`${provider.displayName} is incompatible: ${provider.detail}`);
        await agentBridge.setAgentProviderEnabled({
          home: base.home,
          provider: provider.name,
          enabled: true,
        });
        stdout.write(`ENABLED ${provider.name}: ${provider.displayName} ${provider.version ?? ''}`.trimEnd());
        stdout.write('\nDelivery-loop still requires explicit per-run consent before sending code.\n');
        return 0;
      }

      if (options.agentCommand === 'disable') {
        if (!provider) throw new Error(`Unsupported external agent provider: ${options.provider}`);
        await agentBridge.setAgentProviderEnabled({
          home: base.home,
          provider: provider.name,
          enabled: false,
        });
        stdout.write(`DISABLED ${provider.name}: excluded from delivery-loop proposals\n`);
        return 0;
      }

      if (options.agentCommand === 'policy') {
        if (!provider) throw new Error(`Unsupported external agent provider: ${options.provider}`);
        if (!provider.available) throw new Error(`${provider.displayName} is unavailable: ${provider.detail}`);
        if (!provider.compatible) throw new Error(`${provider.displayName} is incompatible: ${provider.detail}`);
        if (options.agentPolicy === 'isolated-writer' && !provider.roles?.implement) {
          throw new Error(`${provider.displayName} does not provide a safe implementation role`);
        }
        await agentBridge.setAgentProviderPolicy({
          home: base.home,
          provider: provider.name,
          policy: options.agentPolicy,
        });
        stdout.write(`POLICY ${provider.name}: ${options.agentPolicy}\n`);
        stdout.write('Delivery-loop still requires explicit per-run consent before sending code.\n');
        return 0;
      }

      if (options.agentCommand === 'setup') {
        const compatible = providers.filter(
          (candidate) => candidate.available && candidate.compatible,
        );
        if (compatible.length === 0) {
          stdout.write('No compatible external agent CLIs detected. Native host agents remain available.\n');
          return 0;
        }
        for (const candidate of compatible) {
          await agentBridge.setAgentProviderEnabled({
            home: base.home,
            provider: candidate.name,
            enabled: true,
          });
          stdout.write(`ENABLED ${candidate.name}: ${candidate.displayName} ${candidate.version ?? ''} (review-only)`.trimEnd());
          stdout.write('\n');
        }
        stdout.write('Delivery-loop still requires explicit per-run consent before sending code.\n');
        return 0;
      }

      if (options.agentCommand === 'doctor') {
        let failed = false;
        for (const candidate of providers) {
          if (candidate.enabled === false) {
            stdout.write(`PASS ${candidate.name}: disabled by user\n`);
          } else if (!candidate.available || !candidate.compatible) {
            const required = candidate.enabled === true;
            failed ||= required;
            stdout.write(`${required ? 'FAIL' : 'WARN'} ${candidate.name}: ${candidate.detail}\n`);
          } else {
            const roles = Object.entries(candidate.roles ?? {})
              .filter(([, supported]) => supported)
              .map(([role]) => role)
              .join(',');
            stdout.write(`PASS ${candidate.name}: ${candidate.displayName} ${candidate.version ?? 'version unknown'}; ${candidate.enabled === true ? 'enabled' : 'available, not enabled'}; policy=${candidate.policy ?? 'per-run'}; roles=${roles || 'none'}\n`);
          }
        }
        return failed ? 1 : 0;
      }

      for (const candidate of providers) {
        const state = candidate.enabled === true
          ? 'ENABLED'
          : candidate.enabled === false
            ? 'DISABLED'
            : !candidate.available
              ? 'UNAVAILABLE'
              : !candidate.compatible
                ? 'INCOMPATIBLE'
                : 'AVAILABLE';
        const roles = Object.entries(candidate.roles ?? {})
          .filter(([, supported]) => supported)
          .map(([role]) => role)
          .join(',');
        const identity = candidate.identity?.provider
          ? `; model=${candidate.identity.provider}/${candidate.identity.model ?? 'unknown'}`
          : '';
        stdout.write(`${state} ${candidate.name}: ${candidate.displayName}${candidate.version ? ` ${candidate.version}` : ''}; policy=${candidate.policy ?? 'per-run'}; roles=${roles || 'none'}${identity}; ${candidate.detail}\n`);
      }
      return 0;
    },

    async runs(options) {
      const worktree = path.resolve(base.cwd, options.target ?? '.');
      if (options.runCommand === 'show') {
        const result = await loopController.showRun({ worktree, runId: options.runId });
        stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return 0;
      }
      if (options.runCommand === 'purge') {
        if (!options.force) throw new Error('runs purge requires --force');
        const result = await loopController.purgeRepositoryEvidence({ worktree, confirm: true });
        stdout.write(`Purged ${result.removed_runs} local loop run(s) from ${result.repository}.\n`);
        return 0;
      }
      if (options.runCommand === 'supersede') {
        if (!options.confirm) throw new Error('runs supersede requires --confirm');
        const result = await loopController.supersedeLegacyRun({
          worktree,
          runId: options.runId,
          confirm: true,
        });
        stdout.write(`Superseded legacy run ${result.superseded_run_id} with v2 run ${result.state.run_id}; legacy evidence remains read-only.\n`);
        return 0;
      }
      const result = await loopController.listRuns({ worktree });
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    },

    async insights(options) {
      const worktree = path.resolve(base.cwd, options.target ?? '.');
      const result = await loopController.repositoryInsights({ worktree });
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    },

    async eval(options) {
      const corpus = await loadSkillEvalCorpus(path.join(base.packageRoot, 'evals', 'skill-behavior.json'));
      if (options.evalCommand === 'cases') {
        for (const { id, skill, category, prompt } of corpus.cases) {
          stdout.write(`${JSON.stringify({ case_id: id, skill, category, prompt })}\n`);
        }
        return 0;
      }
      if (options.evalCommand === 'score') {
        const resultsPath = path.resolve(base.cwd, options.resultsFile);
        const results = JSON.parse(await readFile(resultsPath, 'utf8'));
        const score = scoreSkillEvalResults(corpus, results, { allowMissing: options.allowMissing });
        if (options.json) {
          stdout.write(`${JSON.stringify(score, null, 2)}\n`);
        } else {
          stdout.write(`Host: ${score.host.name} ${score.host.version}; model ${score.host.model}.\n`);
          stdout.write(`Behavioral eval: ${score.passed}/${score.total} passed; ${score.failed} failed; ${score.missing} missing.\n`);
          stdout.write(`Activation: asserted precision ${score.activation.asserted_precision?.toFixed(3) ?? 'n/a'}; recall ${score.activation.recall?.toFixed(3) ?? 'n/a'}; forbidden ${score.activation.forbidden_activations}/${score.activation.forbidden_opportunities}; unasserted ${score.activation.unasserted_activations}.\n`);
          for (const confusion of score.activation.boundary_confusions) {
            stdout.write(`CONFUSION expected=${confusion.expected} activated=${confusion.activated} count=${confusion.count} cases=${confusion.case_ids.join(',')}\n`);
          }
          for (const failure of score.failures) {
            stderr.write(`${failure.case_id}: ${failure.reasons.join('; ')}\n`);
          }
        }
        return score.ok ? 0 : 1;
      }
      const summary = assertSkillEvalCorpus(corpus);
      stdout.write(`Validated ${summary.cases} behavioral cases across ${summary.skills} skills and ${summary.categories} categories.\n`);
      stdout.write('This validates the corpus only. Use eval cases with a host adapter, then eval score on captured results.\n');
      return 0;
    },

    async uninstall(options) {
      let purgeState;
      let purgeTarget;
      if (options.purgeProject) {
        purgeTarget = path.resolve(base.cwd, options.purgeProject);
        const statePath = path.join(purgeTarget, '.codex-engineering-skills.json');
        if (!await exists(statePath)) throw new Error(`Project ownership state not found: ${statePath}`);
        purgeState = JSON.parse(await readFile(statePath, 'utf8'));
      }
      await removePlugin({ home: base.home, runCodex });
      stdout.write('Engineering plugin uninstalled. Project artifacts were preserved.\n');
      if (purgeState) {
        const statePath = path.join(purgeTarget, '.codex-engineering-skills.json');
        const result = await purgeProject({ targetRoot: purgeTarget, recordedChecksums: purgeState.files });
        if (result.preserved.length === 0) await rm(statePath);
        stdout.write(`Purged ${result.removed.length}; preserved ${result.preserved.length} modified files.\n`);
      }
      return 0;
    },
  };
}
