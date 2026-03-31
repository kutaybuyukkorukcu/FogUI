# Java Artifact Publishing Plan

Goal: publish `fogui-java-core` and `fogui-spring-starter` as consumable OSS artifacts for external Java/Spring teams.

Roadmap alignment: active Phase 4 work in `docs/ROADMAP_OSS.md`.

## Supported Target

Current supported registry: GitHub Packages for this repository.

Deferred follow-up target: Maven Central, after release notes, compatibility policy, and external consumption feedback are stable.

Why this path now:

1. The repository already resolves Java modules from GitHub Packages in `backend-java/pom.xml`.
2. The existing publish workflow and credentials model already point at GitHub Packages.
3. Hardening the working path is the shortest route to a truthful external adoption story.

## Plan

1. Keep default branch versions on `-SNAPSHOT`, but publish tagged/manual releases with an explicit shared Maven `revision`.
2. Add release metadata and `distributionManagement` to the published Java module POMs.
3. Attach source and javadoc jars so external consumers can inspect published APIs.
4. Build + verify the published Java modules before deployment.
5. Document external consumption examples:
   - plain Java validation with `fogui-java-core`
   - Spring Boot usage of `fogui-spring-starter`
6. Publish compatibility notes per release and keep Maven Central as the later registry expansion.

## Implemented in this tranche

1. `.github/workflows/java-publish.yml` now derives the published version from either a `java-vX.Y.Z` tag or a manual workflow input.
2. The Java modules now publish with matching inter-module versions instead of hard-coded `1.0.0-SNAPSHOT` references.
3. Published Java module POMs are flattened before install/deploy so downstream consumers receive resolved release metadata instead of raw `${revision}` placeholders.
4. `fogui-java-core` and `fogui-spring-starter` now declare GitHub Packages `distributionManagement`, SCM, issue tracker, license metadata, and attached source/javadoc jars.
5. External Spring Boot consumption is documented in `docs/SPRING_BOOT_INTEGRATION_GUIDE.md` and backed by `examples/spring-consumer` for non-reactor verification.

## Remaining

1. Validate the full GitHub Packages consumer flow from a clean repository outside this monorepo.
2. Decide when to add the Maven Central path and required signing workflow.

## Status

GitHub Packages publishing is now the supported Phase 4 path and is no longer deferred. Maven Central remains planned work after release discipline hardens.

## Release Versioning

1. Development stays on `1.0.0-SNAPSHOT` through the shared `revision` property in each Java module.
2. Release tags use the format `java-vX.Y.Z` and publish artifacts as `X.Y.Z`.
3. Manual workflow dispatches require an explicit version input and publish that exact version.
4. `fogui-spring-starter` always depends on the same published version of `fogui-java-core`.
