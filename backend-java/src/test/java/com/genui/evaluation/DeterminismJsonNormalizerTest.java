package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("DeterminismJsonNormalizer")
class DeterminismJsonNormalizerTest {

    private final DeterminismJsonNormalizer normalizer = new DeterminismJsonNormalizer(new ObjectMapper());

    @Test
    void shouldNormalizeObjectKeyOrderingAndStripVolatileFields() {
        String left = "{\"b\":1,\"requestId\":\"req-1\",\"a\":2}";
        String right = "{\"a\":2,\"b\":1,\"requestId\":\"req-2\"}";

        String normalizedLeft = normalizer.normalizeJson(left);
        String normalizedRight = normalizer.normalizeJson(right);

        assertEquals(normalizedLeft, normalizedRight);
        assertFalse(normalizedLeft.contains("requestId"));
        assertEquals(normalizer.hash(normalizedLeft), normalizer.hash(normalizedRight));
    }

    @Test
    void shouldReturnNullForInvalidJson() {
        assertNull(normalizer.normalizeJson("not-json"));
    }
}