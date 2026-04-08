# Java Module Migration Notes

## Goal

Move the publishable Java OSS modules into a unified `packages` layout while preserving runtime behavior and artifact identity.

Target structure:

- `packages/fogui-java-core`
- `packages/fogui-spring-boot-starter`
- `packages/react`
- `backend-java`

`backend-java` remains outside `packages` because it is a reference integration server, not a publishable package.

## Applied Strategy

The directory move was applied with path-only updates so Maven coordinates, Java packages, and Spring wiring stay unchanged.

### Stage 0: Clarify boundaries

Done when docs make the ownership model explicit:

- `packages/fogui-java-core` owns canonical contract, validation, translation, and deterministic reconciliation.
- `packages/fogui-spring-boot-starter` owns Spring Boot wiring, advisors, and generation policy integration.
- `backend-java` owns reference endpoints, prompt integration, persistence/auth extras, and real model-call orchestration.

This stage reduces the chance of moving the wrong module or over-coupling package layout to runtime concerns.

### Stage 1: Inventory hard-coded paths

Current repo locations that must be updated during the move:

- Root reactor: `pom.xml`
- Child parent links: `packages/fogui-java-core/pom.xml`, `packages/fogui-spring-boot-starter/pom.xml`, `backend-java/pom.xml`
- Sonar config: `sonar-project.properties`
- CI/CD workflows in `.github/workflows/`
- Docker build context and copies: `backend-java/Dockerfile`
- Local compose mounts: `docker-compose.dev.yml`
- VS Code task assumptions: `.vscode/tasks.json`
- Top-level and module docs: `README.md`, `AGENTS.md`, `docs/*.md`

### Stage 2: Applied path mapping

Applied path mapping:

- `fogui-java-core` -> `packages/fogui-java-core`
- `fogui-spring-starter` -> `packages/fogui-spring-boot-starter`

Required path updates:

1. Root reactor modules in `pom.xml`.
2. Parent `relativePath` values in child POMs.
3. All `-pl` Maven CLI references in workflows and docs.
4. Sonar `projectBaseDir` values.
5. Docker `COPY` paths for sibling modules.
6. Docker compose bind mounts for local development.
7. Any examples or scripts that rely on old relative paths.

### Stage 3: Validate before merging

Minimum validation set:

1. `./backend-java/mvnw -f pom.xml -pl backend-java -am test`
2. `./backend-java/mvnw -f pom.xml -pl :fogui-java-core test`
3. `./backend-java/mvnw -f pom.xml -pl :fogui-spring-starter test`
4. `cd packages/react && npm test && npm run build`
5. Rebuild `backend-java` Docker image.
6. Smoke-test `docker-compose.dev.yml` mounts.

### Stage 4: Clean up old assumptions

After the move is validated:

1. Remove stale path references from docs and comments.
2. Re-run Sonar and confirm coverage paths still resolve.
3. Verify GitHub publish workflows still publish the same Maven coordinates.

## Why This Is Low Risk

This move does not change Maven coordinates, package names, Spring configuration, or Java imports. The risk is almost entirely in path-based tooling. Keeping the migration scoped to path updates preserves the OSS artifact identities:

- `com.genui:fogui-java-core`
- `com.genui:fogui-spring-starter`

## Determinism Ownership

The move should not be used to redefine responsibility boundaries.

`packages/fogui-java-core` contains the determinism-critical implementation:

- canonical validation
- A2UI translation
- stream patch reconciliation
- canonical contract metadata normalization

`packages/fogui-spring-boot-starter` provides deterministic runtime wiring for Spring-based integrations:

- advisor registration
- generation policy services
- auto-configuration of validator/parser/translator/reconciler beans

`backend-java` is still important, but its role is different:

- reference API surface
- model prompt/orchestration integration
- streaming transport via SSE
- auth, usage, persistence, and developer harness concerns

If `backend-java` disappeared, the OSS Java modules would still retain meaningful standalone value for teams that want to embed deterministic validation and compatibility logic into their own Spring or Java applications.

## Validation Checklist

1. Verify path references in build and infra files remain aligned.
2. Run Java and React validation commands after future build-tool changes.
3. Recheck Docker, CI, and Sonar assumptions after any new path-sensitive automation is added.