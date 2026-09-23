# Security

## Data boundary

The helper sends public goal, evidence, revision labels, candidate IDs and descriptions to `https://api.typesafe.ai/v1/systemone` only after the caller declares the input public, sanitized, and checked for candidate coverage. Those declarations are caller assertions, not a data-loss-prevention system. Inspect all fields first. Provider data handling is governed by your TypeSafe agreement.

The API key is read at runtime from `TYPESAFE_API_KEY` or a narrowly named macOS Keychain item. Never commit keys, private inputs, raw provider responses, or credential-bearing logs. CI requires no secrets. Dependency injection in the JavaScript API is for trusted application code and tests; do not accept injected functions from untrusted callers.

Model judgments are untrusted semantic evidence. Validate source facts independently. Output never grants permission for an external action. Runtime limits apply to one invocation; callers must enforce concurrency, aggregate budgets, and retry policy. A caller-provided transport that ignores abort may continue its own work after the helper returns.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/sir-ad/jev-agentic-workflows/security/advisories/new). Include affected version, a minimal synthetic reproduction, and expected versus observed behavior. Do not include credentials or private source material. For ordinary non-sensitive defects, open an issue. Security fixes target the latest release; no response-time guarantee is offered.
