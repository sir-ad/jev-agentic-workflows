# Sources and limits

Read 23 September 2026.

## Motivating article

[Sam Reghenzi: Typed Judgments or Agentic Loops?](https://blog.r6i.it/typesafe-jev-vs-agentic-loop.html)
compares two product-taxonomy workflows. Its useful architectural lesson is to
retain reconsideration and whole-result verification around fast typed judgments.
Its headline speed comparison used different concurrency settings, one run per
configuration and a small dataset. Quality judgments had one annotator and no
independent ground truth. Its reported speedup is not a guarantee for this skill.

The article's suggestion that geometric-mean scores necessarily fall with path
depth is not a general mathematical property: repeating an equal edge probability
leaves its geometric mean unchanged. Such scores still do not establish whole-path
correctness. This skill uses a separate verification call and real task checks.

## Official patterns

- [TypeSafe API](https://docs.typesafe.ai/api): typed request/response contract and usage.
- [Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out): batch independent
  questions and consume only applicable branches; extra questions still use tokens.
- [Hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification):
  retaining multiple paths can preserve alternatives that greedy descent discards.
- [Citation checking](https://docs.typesafe.ai/cookbooks/citation_check): source-grounded
  semantic checks accompany exact quote and location checks.
- [Confidence](https://docs.typesafe.ai/confidence): distribution concentration is
  distinct from complete workflow correctness or authorization.

## Release scope

The helper is deliberately small: selection, verification and review outcomes.
It installs no daemon, proxy, agent runtime, broker integration or persistent cache.
The reasoning agent supplies coverage checks and the evidence needed to reconsider.
No comparative cost, latency or task-accuracy improvement is claimed without a
matched workload evaluation.
