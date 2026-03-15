package com.genui.service;

import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.genui.ThinkingItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("StreamPatchGenerator")
class StreamPatchGeneratorTest {

    private final StreamPatchGenerator generator = new StreamPatchGenerator();

    @Test
    @DisplayName("emits append operations for initial response")
    void emitsAppendOperationsForInitialResponse() {
        GenerativeUIResponse current = GenerativeUIResponse.builder()
                .thinking(List.of(ThinkingItem.builder().status("active").message("Working").build()))
                .content(List.of(ContentBlock.text("Hello")))
                .build();

        var patches = generator.generatePatches(null, current);

        assertEquals(2, patches.size());
        assertEquals("append", patches.get(0).getOp());
        assertEquals("/thinking", patches.get(0).getPath());
        assertEquals("append", patches.get(1).getOp());
        assertEquals("/content", patches.get(1).getPath());
    }

    @Test
    @DisplayName("emits replace when existing content item changes")
    void emitsReplaceWhenExistingContentItemChanges() {
        GenerativeUIResponse previous = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("A")))
                .build();

        GenerativeUIResponse current = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("B")))
                .build();

        var patches = generator.generatePatches(previous, current);

        assertEquals(1, patches.size());
        assertEquals("replace", patches.get(0).getOp());
        assertEquals("/content/0", patches.get(0).getPath());
    }

    @Test
    @DisplayName("emits metadata replacement when metadata changes")
    void emitsMetadataReplacementWhenMetadataChanges() {
        GenerativeUIResponse previous = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("A")))
                .metadata(Map.of("version", "1"))
                .build();

        GenerativeUIResponse current = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("A")))
                .metadata(Map.of("version", "2", "mode", "patch"))
                .build();

        var patches = generator.generatePatches(previous, current);

        assertTrue(patches.stream().anyMatch(p -> "replace".equals(p.getOp()) && "/metadata".equals(p.getPath())));
    }
}
