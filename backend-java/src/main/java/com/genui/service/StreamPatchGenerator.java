package com.genui.service;

import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.genui.ThinkingItem;
import com.genui.model.transform.StreamPatchOperation;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Computes incremental patch operations between two canonical responses.
 */
@Service
public class StreamPatchGenerator {

    private static final String METADATA_PATH = "/metadata";

    public List<StreamPatchOperation> generatePatches(GenerativeUIResponse previous, GenerativeUIResponse current) {
        if (current == null) {
            return Collections.emptyList();
        }

        List<StreamPatchOperation> patches = new ArrayList<>();
        emitThinkingPatches(previous, current, patches);
        emitContentPatches(previous, current, patches);
        emitMetadataPatch(previous, current, patches);
        return patches;
    }

    private void emitThinkingPatches(
            GenerativeUIResponse previous,
            GenerativeUIResponse current,
            List<StreamPatchOperation> patches
    ) {
        List<ThinkingItem> previousThinking = previous != null && previous.getThinking() != null
                ? previous.getThinking()
                : Collections.emptyList();
        List<ThinkingItem> currentThinking = current.getThinking() != null
                ? current.getThinking()
                : Collections.emptyList();

        emitListPatches("/thinking", previousThinking, currentThinking, patches);
    }

    private void emitContentPatches(
            GenerativeUIResponse previous,
            GenerativeUIResponse current,
            List<StreamPatchOperation> patches
    ) {
        List<ContentBlock> previousContent = previous != null && previous.getContent() != null
                ? previous.getContent()
                : Collections.emptyList();
        List<ContentBlock> currentContent = current.getContent() != null
                ? current.getContent()
                : Collections.emptyList();

        emitListPatches("/content", previousContent, currentContent, patches);
    }

    private <T> void emitListPatches(
            String path,
            List<T> previousList,
            List<T> currentList,
            List<StreamPatchOperation> patches
    ) {
        int sharedLength = Math.min(previousList.size(), currentList.size());

        for (int i = 0; i < sharedLength; i++) {
            T previousItem = previousList.get(i);
            T currentItem = currentList.get(i);
            if (!Objects.equals(previousItem, currentItem)) {
                patches.add(StreamPatchOperation.replace(path + "/" + i, currentItem));
            }
        }

        for (int i = sharedLength; i < currentList.size(); i++) {
            patches.add(StreamPatchOperation.append(path, currentList.get(i)));
        }

        for (int i = previousList.size() - 1; i >= currentList.size(); i--) {
            patches.add(StreamPatchOperation.remove(path + "/" + i));
        }
    }

    private void emitMetadataPatch(
            GenerativeUIResponse previous,
            GenerativeUIResponse current,
            List<StreamPatchOperation> patches
    ) {
        Map<String, Object> previousMetadata = previous != null ? previous.getMetadata() : null;
        Map<String, Object> currentMetadata = current.getMetadata();

        if (Objects.equals(previousMetadata, currentMetadata)) {
            return;
        }

        if (currentMetadata == null || currentMetadata.isEmpty()) {
            if (previousMetadata != null && !previousMetadata.isEmpty()) {
                patches.add(StreamPatchOperation.remove(METADATA_PATH));
            }
        } else {
            patches.add(StreamPatchOperation.replace(METADATA_PATH, currentMetadata));
        }
    }
}
