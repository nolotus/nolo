# Evolution decision layer

This layer sits between deterministic run signals and expensive causal analysis.

- Runtime and signal code define facts.
- `EvolutionDecisionModel` performs cheap probabilistic triage over compact state.
- Vendor adapters (currently Jev) map provider-specific answers into the vendor-neutral `EvolutionTriageResult` contract.
- `runEvolutionTriageEval` evaluates any decision-model implementation against labeled synthetic or historical cases and checks the final production triage policy, not just raw probabilities.
- Triage never explains root cause or mutates the system. Deeper reasoning remains the responsibility of a later Case Analyst / verifier stage.

Dependency direction must remain:

`Evolution core -> DecisionModel contract <- provider adapter`

Do not move provider-specific Jev request/response types into the core evolution contracts.

The built-in synthetic cases are only a bootstrap benchmark. Real production decisions should not be enabled from them alone; replace or supplement them with historical run snapshots and validate calibration before wiring triage into the run lifecycle.
