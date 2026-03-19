package com.genui.starter;

import com.genui.contract.FogUiCanonicalValidator;
import com.genui.contract.CanonicalOutboundMapper;
import com.genui.contract.a2ui.A2UiInboundTranslator;
import com.genui.service.StreamPatchReconciler;
import com.genui.service.UIResponseParser;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
public class FogUiCoreAutoConfiguration {

    @Bean
    public UIResponseParser uiResponseParser() {
        return new UIResponseParser();
    }

    @Bean
    public FogUiCanonicalValidator fogUiCanonicalValidator() {
        return new FogUiCanonicalValidator();
    }

    @Bean
    public CanonicalOutboundMapper canonicalOutboundMapper() {
        return new CanonicalOutboundMapper();
    }

    @Bean
    public A2UiInboundTranslator a2UiInboundTranslator() {
        return new A2UiInboundTranslator();
    }

    @Bean
    public StreamPatchReconciler streamPatchReconciler() {
        return new StreamPatchReconciler();
    }
}
