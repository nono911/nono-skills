# Contributing

Thanks for helping improve Nono Skills. The project is experimental, so changes
should keep claims narrow, preserve portability, and include evidence appropriate
to their risk.

## Report a problem

Open a [GitHub issue](https://github.com/nono911/nono-skills/issues) with the
package version, host and model when relevant, the request that triggered the
behavior, the observed result, and the expected result. Remove source code,
credentials, prompts, and other sensitive data from logs or evidence.

## Propose a change

For a substantial workflow or contract change, open an issue before investing in
an implementation. Describe the user outcome, compatibility boundary, failure
mode, and how the behavior can be evaluated. Small documentation and test fixes
can go directly to a pull request.

## Develop locally

Requirements: Node.js 20 or newer and Git.

```bash
npm test
npm run validate
npm run eval:skills
npm run eval:host
npm run test:coverage
npm pack --dry-run
```

When changing shared portable resources, edit the canonical source first and run
`npm run sync:portable`. Add or update deterministic tests and behavioral cases
for user-visible contract changes. Do not publish host/model performance claims
without a committed raw capture and exact host identity.

## Pull request checklist

- Keep skill bodies host-neutral and concise.
- Preserve explicit consent and authority boundaries.
- Describe guided behavior separately from controller-enforced behavior.
- Update `CHANGELOG.md` for user-visible changes.
- Run the relevant checks above and include their results in the pull request.
