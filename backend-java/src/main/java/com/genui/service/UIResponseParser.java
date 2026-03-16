package com.genui.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.genui.ThinkingItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Parses LLM responses and extracts structured UI components.
 * Handles the <genui>...</genui> wrapper format.
 */
@Slf4j
@Service
public class UIResponseParser {

    private static final Pattern GENUI_TAG_PATTERN = Pattern.compile(
            "<genui>(.*?)</genui>",
            Pattern.DOTALL
    );

    private final ObjectMapper objectMapper;

    public UIResponseParser() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * Parses LLM response text and extracts the GenerativeUI response
     */
    public GenerativeUIResponse parse(String llmResponse) {
        if (llmResponse == null || llmResponse.isBlank()) {
            log.warn("Empty LLM response received");
            return null;
        }

        try {
            // Try to extract content from <genui> tags
            var matcher = GENUI_TAG_PATTERN.matcher(llmResponse);

            String jsonContent;
            if (matcher.find()) {
                jsonContent = matcher.group(1).trim();
                log.debug("Extracted genui content: {} chars", jsonContent.length());
            } else {
                // Fallback: try to parse the whole response as JSON
                jsonContent = llmResponse.trim();

                // Remove markdown code blocks if present
                if (jsonContent.startsWith("```json")) {
                    jsonContent = jsonContent.substring(7);
                }
                if (jsonContent.startsWith("```")) {
                    jsonContent = jsonContent.substring(3);
                }
                if (jsonContent.endsWith("```")) {
                    jsonContent = jsonContent.substring(0, jsonContent.length() - 3);
                }
                jsonContent = jsonContent.trim();
            }

            // Parse the JSON
            var response = objectMapper.readValue(jsonContent, GenerativeUIResponse.class);

            if (response != null) {
                log.info("Successfully parsed UI response with {} content blocks",
                        response.getContent() != null ? response.getContent().size() : 0);
            }

            return response;

        } catch (Exception ex) {
            log.error("Failed to parse LLM response as JSON", ex);

            // Fallback: wrap plain text as a simple text response
            return createFallbackResponse(llmResponse);
        }
    }

    /**
     * Creates a fallback response when parsing fails - wraps plain text
     */
    private GenerativeUIResponse createFallbackResponse(String text) {
        // Clean up the text - remove any partial tags
        var cleanText = GENUI_TAG_PATTERN.matcher(text).replaceAll("").trim();

        if (cleanText.isBlank()) {
            cleanText = "I received your request but couldn't format a proper response.";
        }

        var metadata = new HashMap<String, Object>();
        metadata.put("fallback", true);

        return GenerativeUIResponse.builder()
                .thinking(List.of(
                        ThinkingItem.builder()
                                .message("Processing response...")
                                .status("complete")
                                .build()
                ))
                .content(List.of(
                        ContentBlock.text(cleanText)
                ))
                .metadata(metadata)
                .build();
    }

    /**
     * Checks if a string might be valid partial JSON (for streaming)
     */
    public boolean isValidPartialJson(String json) {
        // Basic check - starts with { and has some content
        return json.trim().startsWith("{") && json.length() > 10;
    }

    /**
     * Attempts to parse partial JSON during streaming
     */
    public GenerativeUIResponse tryParsePartial(String json) {
        try {
            String candidateJson = extractPartialJsonCandidate(json);
            if (candidateJson == null || candidateJson.isBlank() || !candidateJson.trim().startsWith("{")) {
                return null;
            }

            // Try to fix incomplete JSON by closing brackets
            var fixedJson = tryFixIncompleteJson(candidateJson);
            return objectMapper.readValue(fixedJson, GenerativeUIResponse.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String extractPartialJsonCandidate(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }

        String trimmed = content.trim();

        int genuiStart = trimmed.indexOf("<genui>");
        if (genuiStart >= 0) {
            trimmed = trimmed.substring(genuiStart + "<genui>".length()).trim();
        }

        int genuiEnd = trimmed.indexOf("</genui>");
        if (genuiEnd >= 0) {
            trimmed = trimmed.substring(0, genuiEnd).trim();
        }

        int firstBrace = trimmed.indexOf('{');
        if (firstBrace >= 0) {
            return trimmed.substring(firstBrace).trim();
        }

        return trimmed;
    }

    /**
     * Attempts to fix incomplete JSON by adding missing closing brackets
     */
    private String tryFixIncompleteJson(String json) {
        long openBraces = json.chars().filter(c -> c == '{').count();
        long closeBraces = json.chars().filter(c -> c == '}').count();
        long openBrackets = json.chars().filter(c -> c == '[').count();
        long closeBrackets = json.chars().filter(c -> c == ']').count();

        var result = new StringBuilder(json);

        // Add missing brackets
        for (int i = 0; i < openBrackets - closeBrackets; i++) {
            result.append(']');
        }
        for (int i = 0; i < openBraces - closeBraces; i++) {
            result.append('}');
        }

        return result.toString();
    }
}
