# Upgrading from v0.13 to v0.14

Version 0.14 introduces Evidence Contract v2 and managed-run schema v2. Existing
v1 evidence is preserved but is read-only.

## Before updating

Pin the currently used version and inspect repository-local runs:

```bash
npx nono-skills@0.13.1 runs list
```

Finishing an active v1 run before upgrading is the simplest path. Do not purge
run evidence merely to update the plugin.

## Update

After v0.14.0 is published:

```bash
npx nono-skills@0.14.0 update
```

Start a new host task so the updated skills are loaded, then inspect the target
repository:

```bash
npx nono-skills@0.14.0 runs list
```

Terminal v1 runs need no action. They remain visible through `runs list` and
`runs show`.

## Continue work blocked by an active v1 run

Review the legacy run first:

```bash
npx nono-skills@0.14.0 runs show <v1-run-id>
```

If a new managed run should continue that work, explicitly create its linked v2
successor:

```bash
npx nono-skills@0.14.0 runs supersede <v1-run-id> /path/to/repository --confirm
```

The command:

- leaves every v1 event and hash untouched;
- inherits kind, acceptance IDs, and risk signals;
- starts the successor from the repository's current committed HEAD;
- records `supersedes_run_id` and exposes `superseded_by_run_id` on the legacy
  run; and
- returns the existing successor when safely repeated.

Supersession is not completion, risk acceptance, or evidence that work performed
under v1 is still valid at the new HEAD. Re-run required verification in v2.

## Integration changes

Review and verification integrations must emit `schema_version: 2`. Every
finding has:

- `evidence_status: supported|insufficient`;
- structured `evidence` containing kind, exact `head_sha`, and concise summary;
  and
- unchanged impact severity regardless of evidence strength.

Every triage item needs an exact disposition `reason_code` and any required
proof. See the packaged `finding-rubric.md` for the complete table and payload
examples.

Completion consumers must distinguish:

- `clean`: no residual findings; and
- `clean_with_residuals`: the managed run completed, but its residual ledger
  still needs disclosure and any appropriate follow-up.

Do not interpret either value as deployment authorization.

## Rollback boundary

Downgrading the installed plugin does not downgrade v2 run evidence. Once a v2
run exists, continue it with a v2-capable release rather than trying to mutate it
with v0.13. Pinning v0.13.1 remains suitable only for repositories that have not
started v2 runs.
