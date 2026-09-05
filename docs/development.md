# Development and release policy

Nono Skills is an experimental `0.x` project. Minor versions may change workflow contracts. Consumers should pin exact versions for repeatable automation and review release notes before updating.

## Verification

```bash
npm test
npm run test:coverage
npm run sync:portable
npm run validate
npm run eval:skills
npm run eval:host
npm pack --dry-run
```

`prepublishOnly` runs tests, validation, both deterministic evaluation checks, and portable-resource synchronization checks. CI runs the supported Node and operating-system matrix plus a coverage job.

The npm tarball intentionally excludes development-only `test/` and `docs/` directories. Tests, evaluation corpora, CI results, and coverage output remain available from the tagged repository source. Package tests inspect the final tarball file list so published runtime and evaluation assets cannot disappear silently.

## Canonical and portable sources

Canonical shared resources live under `plugin/runtime/` and the root templates. The universal installer expects each skill to be self-contained, so `npm run sync:portable` generates matching workspace references and loop-controller copies inside the affected skill directories.

The copies are a portability artifact, not independent implementations. Validation checks that generated files match the canonical source. Change the canonical source first, regenerate, and never patch a generated copy alone.

The controller remains one dependency-free module while its state contract is stabilizing. Evidence and run schema v2 preserve structured findings, disposition proof, and residual completion; schema-v1 runs are read-only and may only gain a linked v2 successor after explicit confirmation. Split the module only when field evidence identifies stable boundaries.

Every contract-changing release must update `CHANGELOG.md`, document upgrade and rollback boundaries, and keep old evidence inspectable without silently rewriting it.

## Evaluation corpora

`evals/skill-behavior.json` covers direct, indirect, incomplete, should-not-activate, and edge prompts for every skill. Export provider-neutral cases and score host results with:

```bash
npx nono-skills eval cases
npx nono-skills eval score path/to/results.json
npx nono-skills eval score path/to/results.json --json
```

The JSON report includes asserted activation precision and recall, forbidden and unasserted activations, per-skill counts, a full case-owner activation matrix, and evidence-linked boundary confusions. These metrics describe only the asserted corpus boundaries. Do not publish a host/model result without committing its raw capture and exact host identity.

`evals/host-behavior.json` contains paired skill-enabled and skill-disabled black-box scenarios. A host adapter accepts one JSON request on stdin and returns the requested activation, output, and metric fields:

```bash
node scripts/eval-host.mjs cases
node scripts/eval-host.mjs run --adapter /path/to/adapter --output host-results.json
node scripts/eval-host.mjs score host-results.json
```

Deterministic validation makes no model calls. Real-host runs are opt-in development work and are never loaded during normal skill use.

The bundled Codex adapter runs each variant in a fresh temporary repository and isolated plugin home. Its preflight installs the candidate plugin and validates the fixture without making a model call:

```bash
node scripts/adapters/codex.mjs --preflight
```

Run the ten-case pilot only with explicit quota authority and an exact model identifier. The example targets GPT-6 Astra, but captures for other supported hosts and models remain valid when their identity is recorded exactly:

```bash
node scripts/eval-host.mjs run \
  --adapter node \
  --adapter-arg scripts/adapters/codex.mjs \
  --adapter-arg --model \
  --adapter-arg gpt-6-astra \
  --output benchmarks/results/codex-<version>-gpt-6-astra.json
```

The adapter derives tool timing from Codex JSONL events and records both fixture and candidate-plugin digests in the host identity. Codex does not expose skill-body and reference loads as dedicated JSONL events, so those counts and canonical activation names are structured model reports; treat them as host-observed evidence, not deterministic telemetry. Keep result captures under `benchmarks/results/`, which is excluded from the npm tarball, and publish a scorecard only with the exact host identity and committed capture.

## Release discipline

Publishing is performed by `.github/workflows/publish.yml` from a GitHub release. The workflow binds the release tag to `package.json`, reruns the complete prepublish suite, inspects the tarball, and publishes from a GitHub-hosted runner with npm provenance.

Before using it, configure `nono-skills` on npmjs.com with the GitHub Actions trusted publisher `nono911/nono-skills`, workflow filename `publish.yml`, and `npm publish` permission. Trusted publishing uses short-lived OIDC credentials instead of a long-lived npm token; the workflow intentionally contains no `NPM_TOKEN`. See the official [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [provenance](https://docs.npmjs.com/generating-provenance-statements/) documentation.

Before a release:

1. State the user-visible contract change and assurance boundary.
2. Add or update a regression test or evaluation case.
3. Run `npm run prepublishOnly` and inspect `npm pack --dry-run`.
4. Publish a prerelease tag first for controller or installer changes with material migration risk.
5. Push the matching `v<package-version>` tag and create the GitHub release; the trusted workflow performs npm publication.

Do not describe model-interpreted guidance as deterministic enforcement. Prefer observed evaluation results over claims about model intelligence or speed.
