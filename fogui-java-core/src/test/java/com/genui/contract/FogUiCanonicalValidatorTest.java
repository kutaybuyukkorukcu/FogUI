package com.genui.contract;

import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FogUiCanonicalValidatorTest {

    private final FogUiCanonicalValidator validator = new FogUiCanonicalValidator();

    @Test
    void shouldValidateCanonicalPayload() {
        GenerativeUIResponse response = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("Hello")))
                .build();

        assertTrue(validator.isValid(response));
    }

    @Test
    void shouldRejectInvalidTextValueType() {
        ContentBlock invalidText = ContentBlock.builder()
                .type("text")
                .value(123)
                .build();

        GenerativeUIResponse response = GenerativeUIResponse.builder()
                .content(List.of(invalidText))
                .build();

        assertFalse(validator.isValid(response));
    }
}
