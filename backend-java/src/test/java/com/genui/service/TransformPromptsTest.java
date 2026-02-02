package com.genui.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TransformPrompts.
 * Tests prompt building logic.
 */
@DisplayName("TransformPrompts")
class TransformPromptsTest {

    @Nested
    @DisplayName("buildTransformPrompt")
    class BuildTransformPrompt {

        @Test
        @DisplayName("should include content wrapped in delimiters")
        void shouldIncludeContentWrappedInDelimiters() {
            String content = "Some user content here";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertTrue(prompt.contains("---"));
            assertTrue(prompt.contains(content));
        }

        @Test
        @DisplayName("should include context hints when provided")
        void shouldIncludeContextHintsWhenProvided() {
            String content = "User content";
            String contextHints = "This is for a dashboard";

            String prompt = TransformPrompts.buildTransformPrompt(content, contextHints);

            assertTrue(prompt.contains("Additional context:"));
            assertTrue(prompt.contains(contextHints));
        }

        @Test
        @DisplayName("should not include context section when hints are null")
        void shouldNotIncludeContextSectionWhenHintsNull() {
            String content = "User content";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertFalse(prompt.contains("Additional context:"));
        }

        @Test
        @DisplayName("should not include context section when hints are empty")
        void shouldNotIncludeContextSectionWhenHintsEmpty() {
            String content = "User content";

            String prompt = TransformPrompts.buildTransformPrompt(content, "");

            assertFalse(prompt.contains("Additional context:"));
        }

        @Test
        @DisplayName("should end with JSON instruction")
        void shouldEndWithJsonInstruction() {
            String content = "User content";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertTrue(prompt.contains("Respond with the JSON structure only."));
        }

        @Test
        @DisplayName("should start with transform instruction")
        void shouldStartWithTransformInstruction() {
            String content = "User content";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertTrue(prompt.startsWith("Transform the following content into structured UI:"));
        }

        @Test
        @DisplayName("should handle multiline content")
        void shouldHandleMultilineContent() {
            String content = "Line 1\nLine 2\nLine 3";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertTrue(prompt.contains("Line 1"));
            assertTrue(prompt.contains("Line 2"));
            assertTrue(prompt.contains("Line 3"));
        }

        @Test
        @DisplayName("should handle special characters in content")
        void shouldHandleSpecialCharactersInContent() {
            String content = "Price: $100 & 50% off! {data: \"value\"}";

            String prompt = TransformPrompts.buildTransformPrompt(content, null);

            assertTrue(prompt.contains(content));
        }
    }

    @Nested
    @DisplayName("TRANSFORM_SYSTEM_PROMPT")
    class TransformSystemPrompt {

        @Test
        @DisplayName("should not be null or empty")
        void shouldNotBeNullOrEmpty() {
            assertNotNull(TransformPrompts.TRANSFORM_SYSTEM_PROMPT);
            assertFalse(TransformPrompts.TRANSFORM_SYSTEM_PROMPT.isEmpty());
        }

        @Test
        @DisplayName("should contain component definitions")
        void shouldContainComponentDefinitions() {
            String prompt = TransformPrompts.TRANSFORM_SYSTEM_PROMPT;

            assertTrue(prompt.contains("Card"));
            assertTrue(prompt.contains("List"));
            assertTrue(prompt.contains("Table"));
            assertTrue(prompt.contains("Container"));
            assertTrue(prompt.contains("Chart"));
        }

        @Test
        @DisplayName("should contain JSON output format instructions")
        void shouldContainJsonOutputFormatInstructions() {
            String prompt = TransformPrompts.TRANSFORM_SYSTEM_PROMPT;

            assertTrue(prompt.contains("JSON"));
            assertTrue(prompt.contains("thinking"));
            assertTrue(prompt.contains("content"));
        }
    }
}
