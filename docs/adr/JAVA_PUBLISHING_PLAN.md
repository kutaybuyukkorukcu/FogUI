# Java Artifact Publishing Plan
Goal: publish `fogui-java-core`, `fogui-spring-starter`, and `fogui-spring-web-starter` as consumable OSS artifacts for external Java/Spring teams.

Backlog alignment: publishable runtime support and Java onboarding work tracked in `docs/BACKLOG.md`.

## Current Position

1. GitHub Packages publishing is implemented as the interim Java release lane for all current Java artifacts.
2. Shared `revision`-based versioning across the reactor is in place for tagged/manual Java releases.
3. The reusable HTTP/runtime surface now lives in `fogui-spring-web-starter` rather than only in `backend-java`.
4. External consumption docs for Spring Boot users are still incomplete.
5. Maven Central remains the intended long-term distribution target, but the migration date and prerequisites are still TBD.

## Interim Release Lane: GitHub Packages

1. Use GitHub Packages for early adopter and release-discipline validation.
2. Release automation is handled by `.github/workflows/java-publish.yml` using explicit versions or `java-v*` tags.
3. Current published artifact set:
	- `com.fogui:fogui-java-core`
	- `com.fogui:fogui-spring-starter`
	- `com.fogui:fogui-spring-web-starter`
4. This lane is operational, but it is not the intended final Java distribution destination.

## Maven Central Target: TBD

Before a Maven Central move, FogUI still needs:

1. Group ownership and namespace confirmation.
2. Required Central metadata, source jars, and javadoc jars where applicable.
3. Signing and staging/release automation.
4. Explicit release policy and compatibility notes.

## Immediate Next Steps

1. Keep GitHub Packages releases healthy as the interim distribution channel.
2. Publish the external Spring Boot consumption guide against released artifacts.
3. Define the Maven Central migration path once the OSS API surface and release discipline stabilize.
4. Attach compatibility notes to each Java release so early adopters know what is stable.

## Status

Interim workflow implemented for the core, Spring integration, and web runtime modules. Maven Central path is intentionally deferred, not abandoned. The main remaining gap for external adoption is concise consumption documentation for Spring Boot teams.
