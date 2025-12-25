## Plan: Best-practice Bun test + coverage config

Update bunfig.toml to keep your “always rerun 3” policy while making results reproducible and CI-friendly. The main changes are adding a fixed `seed` (so `randomize` is deterministic), emitting JUnit XML into `coverage/` for CI tooling, and adding targeted `coveragePathIgnorePatterns` so your 0.9 threshold measures real product code rather than generated/config/script paths.

### Steps
1. Keep `[test] rerunEach = 3` and `[test] randomize = true` as your defaults.
2. Add `[test] seed = <fixed-number>` to make randomized order reproducible.
3. Add `[test.reporter] junit = "coverage/junit.xml"` for CI-friendly test results.
4. Add `[test] onlyFailures = true` to reduce log noise with reruns.
5. Add `[test] coveragePathIgnorePatterns` to exclude migrations/config/artifacts from coverage.

### Further Considerations
1. Fixed `seed` value: pick any constant; rotate occasionally if desired.
2. Coverage ignores: exclude `src/db/migrations/**` and `**/*.d.ts` by default; only ignore `src/types/**` if truly type-only.
