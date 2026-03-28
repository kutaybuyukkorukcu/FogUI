package com.genui.contract.a2ui;

import com.genui.contract.FogUiCanonicalContract;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class A2UiInboundTranslatorTest {

    private final A2UiInboundTranslator translator = new A2UiInboundTranslator();

    @Test
    void shouldTranslateBasicTextAndComponentBlocks() {
        Map<String, Object> payload = Map.of(
                "content", List.of(
                        Map.of("type", "text", "value", "hello"),
                        Map.of(
                                "type", "component",
                                "componentType", "Card",
                                "props", Map.of("title", "Sales")
                        )
                )
        );

        A2UiTranslationResult result = translator.translate(payload);

        assertTrue(result.getErrors().isEmpty());
        assertEquals(2, result.getResponse().getContent().size());
        assertEquals("text", result.getResponse().getContent().get(0).getType());
        assertEquals("component", result.getResponse().getContent().get(1).getType());
        assertEquals(
                FogUiCanonicalContract.CURRENT_CONTRACT_VERSION,
                result.getResponse().getMetadata().get(FogUiCanonicalContract.METADATA_CONTRACT_VERSION_KEY));
    }

    @Test
    void shouldEmitFallbackBlockForUnsupportedNode() {
        Map<String, Object> payload = Map.of(
                "content", List.of(
                        Map.of("foo", "bar")
                )
        );

        A2UiTranslationResult result = translator.translate(payload);

        assertFalse(result.getErrors().isEmpty());
        assertEquals("COMPATIBILITY", result.getErrors().getFirst().getCategory());
        assertEquals("A2UiUnsupportedNode", result.getResponse().getContent().get(0).getComponentType());
    }
}
