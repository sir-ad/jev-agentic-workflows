# Contributing

Keep changes small and focused. Open an issue describing the observable problem or submit a pull request with a synthetic reproduction and a regression test.

Use Node.js 22 or 24. There are no runtime or development dependencies to install.

```sh
npm test
npm run check
npm pack --dry-run
```

Tests must be deterministic and offline. Live checks are optional, use only inspected public fixtures, and incur provider usage. Do not place keys or raw receipts in pull requests.

Preserve the fixed endpoint, explicit public-input gates, bounded requests, review outcomes, and separate verification. Changes to thresholds need evaluation evidence, not a single successful example. Keep the package version and exported `VERSION` synchronized when releasing.

Before a release, run CI, inspect the Git diff and package archive, and confirm the documentation matches actual behavior. Tag the reviewed commit and describe material changes and remaining limits in its GitHub release.
