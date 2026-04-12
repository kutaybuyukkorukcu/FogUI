# Agent Instructions for FogUI Repository

This document provides essential guidelines for AI agents operating within the FogUI repository. Adhering to these instructions ensures consistency, quality, and efficiency.

## 1. Project Overview

FogUI is an OSS-first deterministic agent UI compatibility and rendering layer.

- **`packages/fogui-java-core`**: Canonical contracts, validation, translation primitives, and deterministic stream utilities.
- **`packages/fogui-spring-boot-starter`**: Spring Boot integration glue for wiring FogUI core services.
- **`packages/react`**: Publishable NPM library (`@fogui/react`) for canonical rendering and design-system adapters.
- **`backend-java`**: Reference Spring Boot server exposing transform, stream, and compatibility APIs.
- **`examples/transform-showcase`**: Transform-focused React demo app for validating local canonical UI rendering against the backend.

## 2. Build, Lint, and Test Commands

### 2.0 Code Coverage Requirements

This project enforces **80% code coverage** through SonarCloud quality gates. The following modules are analyzed:

**SonarCloud Configuration** (see `sonar-project.properties`):
- **Backend** (`backend-java`): Java code coverage via JaCoCo
  - Report path: `target/site/jacoco/jacoco.xml`
  - Coverage target: 80% minimum
- **React Package** (`packages/react`): TypeScript coverage via Vitest/Istanbul
  - Report path: `coverage/lcov.info`
  - Coverage target: 80% minimum
- **Excluded**: no extra frontend app module is analyzed beyond `packages/react`

**Important**: When modifying code, ensure tests are added/updated to maintain coverage above 80%.

### 2.1. Backend (`backend-java`)

- **Run Application**:
  ```bash
  cd backend-java && ./mvnw spring-boot:run
  ```
- **Run All Tests**:
  ```bash
  cd backend-java && ./mvnw -B test
  ```
- **Run a Single Test Class**:
  ```bash
  # Runs all tests in TransformControllerTest
  cd backend-java && ./mvnw -B test -Dtest=TransformControllerTest
  ```
- **Run a Single Test Method**:
  ```bash
  cd backend-java && ./mvnw -B test -Dtest=TransformControllerTest#shouldTransformContentWithCardComponent
  ```
- **Build & Package**:
  ```bash
  cd backend-java && ./mvnw -B package -DskipTests
  ```

**Note**: See Section 2.0 for coverage requirements. Run tests with `./mvnw test jacoco:report` to generate local coverage reports.

### 2.2. Frontend Package (`packages/react`)

- **Install Dependencies**:
  ```bash
  cd packages/react && npm install
  ```
- **Run All Tests**:
  ```bash
  cd packages/react && npm run test
  ```
- **Run a Single Test File**:
  ```bash
  # Vitest filters by filename
  cd packages/react && npm run test -- FogUIProvider
  ```
- **Lint**:
  ```bash
  cd packages/react && npm run lint
  ```
- **Type Check**:
  ```bash
  cd packages/react && npm run typecheck
  ```
- **Build**:
  ```bash
  cd packages/react && npm run build
  ```

## 3. Code Style & Conventions

### 3.1. TypeScript / React (`packages/react`)

- **Components**: Use functional components with arrow functions and named exports.
  ```tsx
  export const MyComponent = ({ prop1 }: MyComponentProps) => {
    // ...
  };
  ```
- **Props**: Define component props using an `interface` with a `Props` suffix (e.g., `MyComponentProps`).
- **Types**: Use `interface` for public-facing contracts and object shapes. Use `type` for union types, primitives, or utility types.
- **Imports**: Order imports as follows:
  1. React and other external library imports.
  2. Absolute imports from within the project.
  3. Relative imports.
- **Exports**: Prefer named exports.
- **Naming**:
    - Files/Components: `PascalCase.tsx`
    - Hooks: `useCamelCase.ts`
    - Functions/Variables: `camelCase`

### 3.2. Java / Spring Boot (`backend-java`)

- **Annotations**: Heavily utilize Lombok (`@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`) to reduce boilerplate.
- **Immutability**: Use `final` for dependency-injected fields.
- **DTOs vs Entities**:
    - **Entities**: Reside in `com.genui.entity` and are used for JPA persistence.
    - **DTOs**: Reside in `com.genui.dto`. They are plain POJOs, often created from entities via a static `from(Entity entity)` factory method.
- **Responses**: For controllers, return `ResponseEntity<T>`. Use builder patterns on custom response DTOs with static `success(...)` and `error(...)` factory methods.
- **Error Handling**:
  - Handle expected errors at the controller level and return appropriate `ResponseEntity` statuses.
  - Use a `try-catch (Exception ex)` block for unexpected errors, log them, and return a 500 status.
- **Naming**:
    - Classes: `PascalCase`
    - Methods/Variables: `camelCase`
    - Packages: `lowercase`
    - Constants: `SCREAMING_SNAKE_CASE`

## 4. File Organization

- **`backend-java/src/main/java/com/genui`**:
    - `controller`: REST API endpoints.
    - `service`: Business logic.
    - `repository`: Spring Data JPA interfaces.
    - `entity`: Database models.
    - `dto`: Data Transfer Objects for API communication.
- **`packages/react/src`**:
    - `components`: Reusable UI components.
    - `hooks`: Custom React hooks (`use...`).
    - `__tests__`: Test files, mirroring the `src` structure.
    - `types`: Shared TypeScript type definitions.

## 5. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- **Examples**:
    - `feat(transform): add streaming support`
    - `fix(auth): correct API key validation logic`
    - `refactor(parser): improve fallback handling`
    - `test(provider): add cases for component registry`
    - `docs(agents): create initial agent instructions`
