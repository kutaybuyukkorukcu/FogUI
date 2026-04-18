package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeterminismRuntimeStabilityAnalyzer {

    private static final String TEXT_KIND = "text";
    private static final String COMPONENT_KIND = "component";
    private static final String CHILDREN_KEY = "children";

    private final ObjectMapper objectMapper;
    private final FogUiCanonicalValidator fogUiCanonicalValidator;
    private final DeterminismJsonNormalizer jsonNormalizer;

    public RuntimeHashes analyzeCanonicalResponse(GenerativeUIResponse response) {
        GenerativeUIResponse runtimeFinalSnapshot = toRuntimeFinalSnapshot(response);
        if (runtimeFinalSnapshot == null) {
            return RuntimeHashes.empty();
        }

        String renderProjection = jsonNormalizer.normalizeJson(buildRenderProjection(runtimeFinalSnapshot));
        String normalizedStreamFinalSnapshot = jsonNormalizer.normalizeJson(objectMapper.valueToTree(runtimeFinalSnapshot));

        return new RuntimeHashes(
                jsonNormalizer.hash(renderProjection),
                jsonNormalizer.hash(normalizedStreamFinalSnapshot));
    }

    GenerativeUIResponse toRuntimeFinalSnapshot(GenerativeUIResponse response) {
        if (response == null) {
            return null;
        }

        if (!validateForRuntime(response).isEmpty()) {
            return null;
        }

        GenerativeUIResponse snapshot = objectMapper.convertValue(response, GenerativeUIResponse.class);
        return FogUiCanonicalContract.ensureContractVersionMetadata(snapshot);
    }

    private List<CanonicalValidationError> validateForRuntime(GenerativeUIResponse response) {
        String declaredContractVersion = FogUiCanonicalContract.readContractVersion(response);
        if (declaredContractVersion == null || declaredContractVersion.isBlank()) {
            return fogUiCanonicalValidator.validate(response, CanonicalValidationContext.empty());
        }

        return fogUiCanonicalValidator.validate(
                response,
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());
    }

    private ObjectNode buildRenderProjection(GenerativeUIResponse response) {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode content = root.putArray("content");
        if (response.getContent() == null) {
            return root;
        }

        for (ContentBlock block : response.getContent()) {
            content.add(buildBlockProjection(block));
        }
        return root;
    }

    private ObjectNode buildBlockProjection(ContentBlock block) {
        ObjectNode node = objectMapper.createObjectNode();
        if (block == null) {
            node.put("kind", "null");
            return node;
        }

        if (TEXT_KIND.equals(block.getType())) {
            node.put("kind", "text");
            node.put("value", String.valueOf(block.getValue()));
            return node;
        }

        node.put("kind", COMPONENT_KIND);
        node.put("componentType", block.getComponentType() == null ? "" : block.getComponentType());

        ObjectNode props = buildPropsProjection(block.getProps());
        if (props.size() > 0) {
            node.set("props", props);
        }

        List<ContentBlock> children = extractRenderableChildren(block);
        if (!children.isEmpty()) {
            ArrayNode childNodes = node.putArray(CHILDREN_KEY);
            for (ContentBlock child : children) {
                childNodes.add(buildBlockProjection(child));
            }
        }

        return node;
    }

    private ObjectNode buildPropsProjection(Object rawProps) {
        ObjectNode props = objectMapper.createObjectNode();
        if (!(rawProps instanceof Map<?, ?> map)) {
            return props;
        }

        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() != null) {
                String key = String.valueOf(entry.getKey());
                if (!CHILDREN_KEY.equals(key)) {
                    props.set(key, objectMapper.valueToTree(entry.getValue()));
                }
            }
        }
        return props;
    }

    private List<ContentBlock> extractRenderableChildren(ContentBlock block) {
        if (block.getChildren() != null && !block.getChildren().isEmpty()) {
            return block.getChildren();
        }

        if (!(block.getProps() instanceof Map<?, ?> map)) {
            return List.of();
        }

        Object rawChildren = map.get(CHILDREN_KEY);
        if (rawChildren == null) {
            return List.of();
        }

        if (rawChildren instanceof List<?> list) {
            List<ContentBlock> children = new ArrayList<>();
            for (Object child : list) {
                ContentBlock contentBlock = toContentBlock(child);
                if (contentBlock != null) {
                    children.add(contentBlock);
                }
            }
            return children;
        }

        ContentBlock contentBlock = toContentBlock(rawChildren);
        return contentBlock == null ? List.of() : List.of(contentBlock);
    }

    private ContentBlock toContentBlock(Object rawChild) {
        if (!isContentBlockLike(rawChild)) {
            return null;
        }

        if (rawChild instanceof ContentBlock contentBlock) {
            return contentBlock;
        }

        try {
            return objectMapper.convertValue(rawChild, ContentBlock.class);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private boolean isContentBlockLike(Object value) {
        if (value instanceof ContentBlock contentBlock) {
            return TEXT_KIND.equals(contentBlock.getType()) || COMPONENT_KIND.equals(contentBlock.getType());
        }

        if (!(value instanceof Map<?, ?> map)) {
            return false;
        }

        Object rawType = map.get("type");
        return TEXT_KIND.equals(rawType) || COMPONENT_KIND.equals(rawType);
    }

    public record RuntimeHashes(String renderHash, String streamFinalSnapshotHash) {

        public static RuntimeHashes empty() {
            return new RuntimeHashes(null, null);
        }
    }
}