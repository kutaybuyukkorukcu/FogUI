package com.genui.service;

import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.genui.ThinkingItem;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class StreamPatchReconcilerTest {

    private final StreamPatchReconciler reconciler = new StreamPatchReconciler();

    @Test
    void shouldReturnNormalizedIncomingWhenNoPreviousSnapshotExists() {
        GenerativeUIResponse incoming = GenerativeUIResponse.builder()
                .thinking(List.of(ThinkingItem.builder().message("step").status("complete").build()))
                .content(List.of(ContentBlock.text("hello")))
                .metadata(Map.of("sourceProtocol", "a2ui"))
                .build();

        GenerativeUIResponse merged = reconciler.reconcile(null, incoming);

        assertEquals(1, merged.getThinking().size());
        assertEquals(1, merged.getContent().size());
        assertEquals("hello", merged.getContent().getFirst().getValue());
        assertEquals("a2ui", merged.getMetadata().get("sourceProtocol"));
    }

    @Test
    void shouldKeepPreviousBlocksWhenIncomingPatchHasEmptyArrays() {
        GenerativeUIResponse previous = GenerativeUIResponse.builder()
                .thinking(List.of(ThinkingItem.builder().message("old").status("complete").build()))
                .content(List.of(ContentBlock.text("old-content")))
                .metadata(Map.of("model", "gpt"))
                .build();

        GenerativeUIResponse incoming = GenerativeUIResponse.builder()
                .thinking(List.of())
                .content(List.of())
                .build();

        GenerativeUIResponse merged = reconciler.reconcile(previous, incoming);

        assertEquals("old", merged.getThinking().getFirst().getMessage());
        assertEquals("old-content", merged.getContent().getFirst().getValue());
        assertEquals("gpt", merged.getMetadata().get("model"));
    }

    @Test
    void shouldPreferIncomingWhenIncomingPatchContainsConcreteValues() {
        GenerativeUIResponse previous = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("old-content")))
                .build();

        GenerativeUIResponse incoming = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("new-content")))
                .build();

        GenerativeUIResponse merged = reconciler.reconcile(previous, incoming);

        assertNotNull(merged.getContent());
        assertEquals("new-content", merged.getContent().getFirst().getValue());
    }
}
