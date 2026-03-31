package com.fogui.examples.springconsumer;

import com.genui.contract.CanonicalOutboundMapper;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.starter.advisor.CanonicalValidationAdvisor;
import com.genui.starter.advisor.DeterministicOptionsAdvisor;
import com.genui.starter.policy.FogUiGenerationPolicyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = FogUiConsumerApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.NONE)
class FogUiStarterExternalConsumerTest {

    private static final String METADATA_KEY = "metadata";

    @Autowired
    private FogUiCanonicalValidator canonicalValidator;

    @Autowired
    private CanonicalOutboundMapper canonicalOutboundMapper;

    @Autowired
    private FogUiGenerationPolicyService generationPolicyService;

    @Autowired
    private CanonicalDemoService canonicalDemoService;

    @Autowired
    private DeterministicOptionsAdvisor deterministicOptionsAdvisor;

    @Autowired
    private CanonicalValidationAdvisor canonicalValidationAdvisor;

    @Test
    void shouldAutoConfigureFogUiStarterBeans() {
        assertThat(canonicalValidator).isNotNull();
        assertThat(canonicalOutboundMapper).isNotNull();
        assertThat(generationPolicyService).isNotNull();
        assertThat(deterministicOptionsAdvisor).isNotNull();
        assertThat(canonicalValidationAdvisor).isNotNull();
    }

    @Test
    void shouldResolveDeterministicDefaults() {
        var policy = generationPolicyService.resolve("gpt-4.1-nano");

        assertThat(policy.getModel()).isEqualTo("gpt-4.1-nano");
        assertThat(policy.getTemperature()).isEqualTo(0.0);
        assertThat(policy.getTopP()).isEqualTo(1.0);
        assertThat(policy.getSkippedOptions()).isEmpty();
    }

    @Test
    void shouldRenderValidatedCanonicalPayload() {
        Map<String, Object> payload = canonicalDemoService.greetingPayload("Hello from FogUI starter");

        assertThat(payload).containsKeys("thinking", "content", METADATA_KEY);
        assertThat(payload.get("content")).isNotNull();
        assertThat(payload.get(METADATA_KEY)).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) payload.get(METADATA_KEY);

        assertThat(metadata)
                .containsEntry("contractVersion", FogUiCanonicalContract.CURRENT_CONTRACT_VERSION);
    }
}