# Reusing Verification

Use existing executed results only when they still prove the current change. This avoids redundant execution, not required verification.

- Confirm the tested source snapshot, including relevant uncommitted and generated inputs, dependencies or lockfile, configuration, fixtures, environment, command, coverage, and result. A shared HEAD alone does not prove equivalence.
- Reuse passing evidence only when those inputs and required assertions remain valid and repository or release policy does not require a fresh run. Cite the original command and snapshot and disclose reuse; never describe it as a newly executed check.
- An edit, dependency or environment change, stale or unavailable provenance, flaky result, failed check, changed assertion, or unresolved risk invalidates affected proof. Run the affected checks and broaden when impact or repository policy requires it.
- A summary saying "tests passed" is insufficient without accessible execution evidence. Human acceptance, UI observations, CI, and production proof remain distinct boundaries.
- In a managed loop, evidence must satisfy the controller's current-HEAD contract. Do not relabel old evidence for a new HEAD or skip any required transition. Reuse within the same verified snapshot does not replace fresh independent review.
- On completion, report which required checks executed, which were validly reused, and what remains unverified. Use the owning workflow's verdict.
