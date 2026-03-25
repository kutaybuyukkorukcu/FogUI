# Java Artifact Publishing Plan

Goal: publish `fogui-java-core` and `fogui-spring-starter` as consumable OSS artifacts for external Java/Spring teams.

## Plan

1. Choose distribution target (Maven Central recommended).
2. Add `distributionManagement`, signing, and release metadata to Java module POMs.
3. Introduce release workflow for Java artifacts:
   - Build + test all Java modules.
   - Run quality gates.
   - Publish signed artifacts on version tag.
4. Document external consumption examples:
   - Plain Java usage of `fogui-java-core`.
   - Spring Boot usage of `fogui-spring-starter`.
5. Version policy:
   - Semantic versioning.
   - Compatibility notes per release.

## Status

Planning complete. Workflow implementation intentionally deferred until OSS API surface is stabilized.
