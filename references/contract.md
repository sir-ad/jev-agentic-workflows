# Decision helper contract

`node scripts/judge.mjs` reads one JSON object from stdin and prints JSON. Invalid
input or unsupported arguments exit 2 with a generic error. A valid invocation exits 0 even for review or
service unavailability: inspect `status` and `reason` rather than the exit code.

## Selection

```json
{
  "mode": "select",
  "goal": "Choose the category supported by the product description.",
  "evidence": "A ceramic cup with a handle for drinking tea at a desk. It is not insulated and has no lid.",
  "evidenceVersion": "public-demo-1",
  "candidates": [
    {"id":"drinkware","description":"Cups and mugs for drinking beverages."},
    {"id":"insulated_carriers","description":"Insulated containers for transporting hot or cold food or drinks."}
  ],
  "coverageChecked": true,
  "public": true,
  "sanitized": true
}
```

`status: candidate` returns a provisional `selectedId`. `rankedCandidates` preserves
each option's relative probability and independent fit judgment. Explicit `none`
and `unknown` return `review`; they never become an automatic fallback category.
A `none` winner combined with a strong candidate fit returns `conflicting_judgments`.

## Verification

Use the same goal, updated original evidence and candidates, set `mode: verify`
and supply `selectedId`. For a hierarchy, the selected candidate description must
describe the complete path, including parent meanings and exclusions. Do not send
the earlier probabilities as evidence. Keep plausible alternatives available.

The request asks a supported/contradicted/insufficient Choice and an independent
evidence-sufficiency Noul. `highConsequence: true` requires reviewer escalation even
when the model supports the result. It does not grant additional execution rights.

## Fields and bounds

| Field | Constraint |
| --- | --- |
| mode | select or verify |
| goal | Nonempty, up to 800 characters; acceptance criteria |
| evidence | Nonempty, up to 12,000 characters; inspected public facts |
| evidenceVersion | Nonempty, up to 100 characters; public revision label |
| candidates | 1–12; unique IDs, descriptions up to 500 characters |
| selectedId | Required only for verify; must exist in candidates |
| public, sanitized | Both must be true for any network call |
| coverageChecked | Must be true for any network call |
| highConsequence | Optional boolean; default false |
| timeoutMs | 100–8,000; default 5,000; one API call, no retries |

Unknown input fields, including keys and endpoints, are rejected. Standard input
is limited to 24,000 bytes and provider responses to 65,536 bytes before parsing.
The HTTP deadline includes body reads; Keychain lookup is separately bounded to
three seconds. Redirects are disallowed. This helper has no OpenAI dependency.

## Provisional policy

Selection requires Choice confidence >= 0.65, selected probability >= 0.75,
candidate-fit Noul >= 0.8 and sufficiency Noul >= 0.8. Verification requires supported
probability >= 0.8, confidence >= 0.65 and sufficiency >= 0.8. Failure returns review.
These are engineering defaults to validate against real task labels; no universal
success probability follows from them. The output retains raw judgments for review.

The SHA-256 decision ID binds the request, policy version, coverage flag and
consequence flag. It is useful for tracing exact requests; it is neither a cache
hit nor proof that two calls used the same backend model. Provider model and usage
are returned separately. Never interpret status as permission to execute a tool.
