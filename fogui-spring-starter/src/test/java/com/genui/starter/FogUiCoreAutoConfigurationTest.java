package com.genui.starter;

import com.genui.contract.FogUiCanonicalValidator;
import com.genui.contract.CanonicalOutboundMapper;
import com.genui.contract.a2ui.A2UiInboundTranslator;
import com.genui.service.StreamPatchReconciler;
import com.genui.service.UIResponseParser;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class FogUiCoreAutoConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(org.springframework.boot.autoconfigure.AutoConfigurations.of(FogUiCoreAutoConfiguration.class));

    @Test
    void shouldRegisterCoreBeans() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(UIResponseParser.class);
            assertThat(context).hasSingleBean(FogUiCanonicalValidator.class);
            assertThat(context).hasSingleBean(CanonicalOutboundMapper.class);
            assertThat(context).hasSingleBean(A2UiInboundTranslator.class);
            assertThat(context).hasSingleBean(StreamPatchReconciler.class);
        });
    }
}
