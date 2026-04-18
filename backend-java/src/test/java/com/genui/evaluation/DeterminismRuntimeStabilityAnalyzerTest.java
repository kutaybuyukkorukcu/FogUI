package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.genui.ThinkingItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("DeterminismRuntimeStabilityAnalyzer")
class DeterminismRuntimeStabilityAnalyzerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DeterminismJsonNormalizer jsonNormalizer = new DeterminismJsonNormalizer(objectMapper);
    private final DeterminismRuntimeStabilityAnalyzer analyzer = new DeterminismRuntimeStabilityAnalyzer(
            objectMapper,
            new FogUiCanonicalValidator(),
            jsonNormalizer);

    @Test
    void shouldIgnoreThinkingAndMetadataWhenHashingRenderPlan() {
        GenerativeUIResponse first = GenerativeUIResponse.builder()
                .thinking(List.of(ThinkingItem.builder().message("step-1").timestamp("2025-01-01T00:00:00Z").build()))
                .content(List.of(cardWithChildren(List.of(ContentBlock.text("Revenue is up")))))
                .metadata(Map.of("requestId", "req-1", "theme", "light"))
                .build();

        GenerativeUIResponse second = GenerativeUIResponse.builder()
                .thinking(List.of(ThinkingItem.builder().message("step-2").timestamp("2025-02-01T00:00:00Z").build()))
                .content(List.of(cardWithPropsChildren(List.of(Map.of("type", "text", "value", "Revenue is up")))))
                .metadata(Map.of("requestId", "req-2", "theme", "dark"))
                .build();

        DeterminismRuntimeStabilityAnalyzer.RuntimeHashes firstHashes = analyzer.analyzeCanonicalResponse(first);
        DeterminismRuntimeStabilityAnalyzer.RuntimeHashes secondHashes = analyzer.analyzeCanonicalResponse(second);

        assertNotNull(firstHashes.renderHash());
        assertEquals(firstHashes.renderHash(), secondHashes.renderHash());
    }

    @Test
    void shouldHashRuntimeFinalSnapshotWithInjectedContractVersion() {
        GenerativeUIResponse response = GenerativeUIResponse.builder()
                .thinking(List.of())
                .content(List.of(ContentBlock.text("Hello")))
                .build();

        DeterminismRuntimeStabilityAnalyzer.RuntimeHashes hashes = analyzer.analyzeCanonicalResponse(response);

        GenerativeUIResponse runtimeSnapshot = FogUiCanonicalContract.ensureContractVersionMetadata(
                objectMapper.convertValue(response, GenerativeUIResponse.class));
        String expectedNormalizedSnapshot = jsonNormalizer.normalizeJson(objectMapper.valueToTree(runtimeSnapshot));

        assertNotNull(hashes.renderHash());
        assertEquals(jsonNormalizer.hash(expectedNormalizedSnapshot), hashes.streamFinalSnapshotHash());
    }

    @Test
    void shouldReturnEmptyHashesForInvalidCanonicalResponse() {
        GenerativeUIResponse response = GenerativeUIResponse.builder()
                .thinking(List.of())
                .content(List.of(ContentBlock.builder()
                        .type("card")
                        .componentType("Card")
                        .props(Map.of())
                        .build()))
                .build();

        DeterminismRuntimeStabilityAnalyzer.RuntimeHashes hashes = analyzer.analyzeCanonicalResponse(response);

        assertNull(hashes.renderHash());
        assertNull(hashes.streamFinalSnapshotHash());
    }

    private ContentBlock cardWithChildren(List<ContentBlock> children) {
        return ContentBlock.builder()
                .type("component")
                .componentType("Card")
                .props(Map.of("title", "Summary"))
                .children(children)
                .build();
    }

    private ContentBlock cardWithPropsChildren(List<Map<String, Object>> children) {
        return ContentBlock.builder()
                .type("component")
                .componentType("Card")
                .props(Map.of(
                        "title", "Summary",
                        "children", children))
                .build();
    }
}