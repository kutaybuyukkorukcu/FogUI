# Spring Boot Integration Guide

Use this guide when you want to consume published FogUI Java modules from an external Spring Boot project. If you are working inside the FogUI monorepo or running the reference server, use `docs/OSS_QUICKSTART.md` instead.

## What to Consume

- `com.genui:fogui-java-core`: canonical contract types, deterministic validation, compatibility translation primitives, and stream utilities.
- `com.genui:fogui-spring-starter`: Spring Boot auto-configuration for the core services plus deterministic Spring AI advisor wiring.

`fogui-spring-starter` already brings in `fogui-java-core`, so most Spring Boot applications only need the starter.

Repository verification sample: `examples/spring-consumer` shows a standalone Spring Boot project that consumes `fogui-spring-starter` outside the monorepo reactor.

## Supported Registry

Current supported registry: GitHub Packages for `kutaybuyukkorukcu/FogUI`.

- Registry URL: `https://maven.pkg.github.com/kutaybuyukkorukcu/FogUI`
- Workflow: `.github/workflows/java-publish.yml`
- Release tag format: `java-vX.Y.Z`
- Default branch version: `1.0.0-SNAPSHOT`

Maven Central remains a later follow-up, not the current supported distribution path.

## 1. Configure Maven Credentials

Add a `github` server entry to `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>github</id>
      <username>YOUR_GITHUB_USERNAME</username>
      <password>YOUR_GITHUB_TOKEN</password>
    </server>
  </servers>
</settings>
```

The token needs package read access for consumption and package write access if you publish.

## 2. Add the Repository and Dependencies

For a Spring Boot application, add the GitHub Packages repository and the starter dependency:

```xml
<properties>
  <fogui.version>1.0.0</fogui.version>
</properties>

<repositories>
  <repository>
    <id>github</id>
    <name>GitHub Packages - FogUI</name>
    <url>https://maven.pkg.github.com/kutaybuyukkorukcu/FogUI</url>
  </repository>
  <repository>
    <id>spring-milestones</id>
    <name>Spring Milestones</name>
    <url>https://repo.spring.io/milestone</url>
  </repository>
</repositories>

<dependencies>
  <dependency>
    <groupId>com.genui</groupId>
    <artifactId>fogui-spring-starter</artifactId>
    <version>${fogui.version}</version>
  </dependency>
</dependencies>
```

If you only need canonical types and validation outside Spring Boot, depend on `fogui-java-core` directly:

```xml
<dependency>
  <groupId>com.genui</groupId>
  <artifactId>fogui-java-core</artifactId>
  <version>${fogui.version}</version>
</dependency>
```

## 3. What the Starter Auto-Configures

Adding `fogui-spring-starter` registers these core beans when they are not already provided by your application:

- `ObjectMapper`
- `UIResponseParser`
- `FogUiCanonicalValidator`
- `CanonicalOutboundMapper`
- `A2UiInboundTranslator`
- `StreamPatchReconciler`
- `FogUiGenerationPolicyService`
- `DeterministicOptionsAdvisor`
- `CanonicalValidationAdvisor`

The auto-configuration entry is `com.genui.starter.FogUiCoreAutoConfiguration`, so consumers do not need any manual `@Import` for the default setup.

## 4. Configure Deterministic Defaults

`fogui-spring-starter` exposes deterministic generation and advisor toggles through Spring Boot configuration properties:

```yaml
fogui:
  deterministic:
    temperature: 0.0
    top-p: 1.0
    seed: 7
    max-tokens: 512
    capabilities:
      seed: false
      max-completion-tokens: false
  advisors:
    enabled: true
    fail-fast: true
    deterministic-options:
      enabled: true
    canonical-validation:
      enabled: true
```

Use the `capabilities` flags when your model provider does not support one of the deterministic options. Unsupported options are skipped deterministically by `FogUiGenerationPolicyService` instead of leaking provider-specific failures into the call path.

## 5. Validate Canonical Payloads in Application Code

Use `FogUiCanonicalValidator` when your application receives or builds canonical responses outside the reference server:

```java
package com.example.fogui;

import com.genui.contract.CanonicalOutboundMapper;
import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.model.genui.GenerativeUIResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CanonicalResponseService {

    private final FogUiCanonicalValidator canonicalValidator;
    private final CanonicalOutboundMapper outboundMapper;

    public CanonicalResponseService(
            FogUiCanonicalValidator canonicalValidator,
            CanonicalOutboundMapper outboundMapper
    ) {
        this.canonicalValidator = canonicalValidator;
        this.outboundMapper = outboundMapper;
    }

    public Map<String, Object> toRendererPayload(GenerativeUIResponse response) {
        List<CanonicalValidationError> diagnostics = canonicalValidator.validate(
                response,
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());

        if (!diagnostics.isEmpty()) {
            throw new IllegalArgumentException("FogUI canonical validation failed: " + diagnostics);
        }

        FogUiCanonicalContract.ensureContractVersionMetadata(response);
        return outboundMapper.toRendererPayload(response);
    }
}
```

## 6. Use the Advisors in a Spring AI Chat Client

The starter registers deterministic Spring AI advisors as beans. A typical integration pattern is to inject all available advisors into the `ChatClient` builder and then add per-request context parameters:

```java
package com.example.fogui;

import com.genui.starter.advisor.FogUiAdvisorContextKeys;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class FogUiChatClientFactory {

    private final OpenAiChatModel chatModel;
    private final List<Advisor> advisors;

    public FogUiChatClientFactory(OpenAiChatModel chatModel, List<Advisor> advisors) {
        this.chatModel = chatModel;
        this.advisors = advisors;
    }

    public ChatClient createClient() {
        return ChatClient.builder(chatModel)
                .defaultAdvisors(advisors)
                .build();
    }

    public ChatClient.ChatClientRequestSpec applyFogUiContext(
            ChatClient.ChatClientRequestSpec requestSpec,
            String requestId,
            String routeMode
    ) {
        requestSpec.advisors(spec -> spec
                .param(FogUiAdvisorContextKeys.REQUEST_ID, requestId)
                .param(FogUiAdvisorContextKeys.ROUTE_MODE, routeMode));
        return requestSpec;
    }
}
```

Use `FogUiAdvisorContextKeys.ROUTE_TRANSFORM` for the sync transform path and `FogUiAdvisorContextKeys.ROUTE_TRANSFORM_STREAM` for the stream path.

## 7. Handle Deterministic Advisor Failures

When `fogui.advisors.fail-fast=true`, deterministic parsing and validation failures surface as `FogUiAdvisorException` with stable error codes and structured details:

```java
package com.example.fogui;

import com.genui.starter.advisor.FogUiAdvisorException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class FogUiExceptionHandler {

    @ExceptionHandler(FogUiAdvisorException.class)
    public ResponseEntity<Map<String, Object>> handleFogUiAdvisorFailure(FogUiAdvisorException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of(
                        "message", ex.getMessage(),
                        "errorCode", ex.getErrorCode(),
                        "details", ex.getDetails()));
    }
}
```

The stable error codes currently exposed by the starter are:

- `CANONICAL_RESPONSE_MISSING`
- `CANONICAL_PARSE_FAILED`
- `CANONICAL_VALIDATION_FAILED`

## 8. Compatibility Path Example

If your system accepts A2UI payloads before rendering, use the translator and validator together:

```java
package com.example.fogui;

import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.contract.a2ui.A2UiInboundTranslator;
import com.genui.contract.a2ui.A2UiTranslationResult;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class A2UiBridgeService {

    private final A2UiInboundTranslator translator;
    private final FogUiCanonicalValidator canonicalValidator;

    public A2UiBridgeService(
            A2UiInboundTranslator translator,
            FogUiCanonicalValidator canonicalValidator
    ) {
        this.translator = translator;
        this.canonicalValidator = canonicalValidator;
    }

    public A2UiTranslationResult translate(Map<String, Object> payload) {
        A2UiTranslationResult result = translator.translate(payload);

        canonicalValidator.validate(
                result.getResponse(),
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());

        return result;
    }
}
```

## 9. External Verification Checklist

1. Resolve `fogui-spring-starter` from GitHub Packages without using reactor mode.
2. Confirm the starter auto-registers its beans and advisors.
3. Call your transform flow twice with the same deterministic settings and confirm canonical payload shape stays stable.
4. Confirm canonical responses carry `metadata.contractVersion = "fogui/1.0"`.
5. Exercise your stream path and verify the ordered lifecycle stays `result` -> `usage` -> `done` or `error`.
6. Catch and log `FogUiAdvisorException` with `errorCode` and `details` so deterministic failures remain observable.

## 10. Repository Maintainer Verification Path

To prove the starter works outside reactor mode before publishing a tag:

1. Install the current Java modules to your local Maven repository:

```bash
./backend-java/mvnw -B -f pom.xml -pl fogui-java-core,fogui-spring-starter -am install
```

2. Run the standalone sample test suite:

```bash
./backend-java/mvnw -B -f examples/spring-consumer/pom.xml test
```

That sample resolves `com.genui:fogui-spring-starter` like an external project instead of depending on the monorepo reactor.