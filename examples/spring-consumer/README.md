# Spring Consumer Example

This example verifies that `fogui-spring-starter` can be consumed like an external Spring Boot project without relying on the monorepo reactor.

What it proves:

1. `com.genui:fogui-spring-starter` resolves from Maven coordinates instead of sibling-module reactor wiring.
2. FogUI starter auto-configuration registers the expected canonical and deterministic beans.
3. A downstream Spring Boot app can inject and use the starter surface directly.

## Local maintainer verification

1. Install the current Java modules into your local Maven repository:

```bash
./backend-java/mvnw -B -f pom.xml -pl fogui-java-core,fogui-spring-starter -am install
```

2. Run the example test suite:

```bash
./backend-java/mvnw -B -f examples/spring-consumer/pom.xml test
```

## Validate a published release

1. Configure `~/.m2/settings.xml` with a `github` server entry matching the GitHub Packages docs.
2. Set `fogui.version` in `pom.xml` to the tagged release version.
3. Run:

```bash
mvn -f examples/spring-consumer/pom.xml test
```

This is the repository’s current closest approximation of a clean external-consumer verification path.