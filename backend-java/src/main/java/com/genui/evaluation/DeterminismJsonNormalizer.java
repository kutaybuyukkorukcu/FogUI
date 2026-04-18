package com.genui.evaluation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Component
public class DeterminismJsonNormalizer {

    private static final Set<String> VOLATILE_FIELDS = Set.of(
            "requestId",
            "processingTimeMs",
            "transformTokens",
            "estimatedCost"
    );

    private final ObjectMapper objectMapper;

    public DeterminismJsonNormalizer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy();
    }

    public String normalizeJson(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }

        try {
            return normalizeJson(objectMapper.readTree(rawJson));
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    public String normalizeJson(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(sortNode(node));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to normalize JSON node", ex);
        }
    }

    public String hash(String normalizedJson) {
        if (normalizedJson == null || normalizedJson.isBlank()) {
            return null;
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalizedJson.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private JsonNode sortNode(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sorted = objectMapper.createObjectNode();
            List<String> fieldNames = new ArrayList<>();
            node.fieldNames().forEachRemaining(fieldNames::add);
            Collections.sort(fieldNames);
            for (String fieldName : fieldNames) {
                if (!VOLATILE_FIELDS.contains(fieldName)) {
                    sorted.set(fieldName, sortNode(node.get(fieldName)));
                }
            }
            return sorted;
        }

        if (node.isArray()) {
            ArrayNode normalized = objectMapper.createArrayNode();
            for (JsonNode child : node) {
                normalized.add(sortNode(child));
            }
            return normalized;
        }

        return node;
    }
}