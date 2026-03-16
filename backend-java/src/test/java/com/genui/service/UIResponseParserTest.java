package com.genui.service;

import com.genui.model.genui.GenerativeUIResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Foundational tests for UIResponseParser.
 * These tests validate the core JSON parsing logic that transforms
 * LLM output into structured UI components.
 */
@DisplayName("UIResponseParser")
class UIResponseParserTest {

    private UIResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new UIResponseParser();
    }

    @Nested
    @DisplayName("Basic Parsing")
    class BasicParsing {

        @Test
        @DisplayName("should parse valid JSON with text block")
        void shouldParseValidJsonWithTextBlock() {
            String json = """
                    {
                      "thinking": [{"message": "Processing...", "status": "complete"}],
                      "content": [
                        {"type": "text", "value": "Hello World"}
                      ]
                    }
                    """;

            GenerativeUIResponse result = parser.parse(json);

            assertNotNull(result);
            assertNotNull(result.getContent());
            assertEquals(1, result.getContent().size());
            assertEquals("text", result.getContent().get(0).getType());
            assertEquals("Hello World", result.getContent().get(0).getValue());
        }

        @Test
        @DisplayName("should parse valid JSON with component block")
        void shouldParseValidJsonWithComponentBlock() {
            String json = """
                    {
                      "thinking": [],
                      "content": [
                        {
                          "type": "component",
                          "componentType": "card",
                          "props": {"title": "Test Card", "data": {"value": 42}}
                        }
                      ]
                    }
                    """;

            GenerativeUIResponse result = parser.parse(json);

            assertNotNull(result);
            assertNotNull(result.getContent());
            assertEquals(1, result.getContent().size());
            assertEquals("component", result.getContent().get(0).getType());
            assertEquals("card", result.getContent().get(0).getComponentType());
        }

        @Test
        @DisplayName("should return null for empty input")
        void shouldReturnNullForEmptyInput() {
            assertNull(parser.parse(null));
            assertNull(parser.parse(""));
            assertNull(parser.parse("   "));
        }
    }

    @Nested
    @DisplayName("Nested Components (Container with Children)")
    class NestedComponents {

        @Test
        @DisplayName("should parse container with nested card children")
        void shouldParseContainerWithNestedCardChildren() {
            String json = """
                    {
                      "thinking": [],
                      "content": [
                        {
                          "type": "component",
                          "componentType": "container",
                          "props": {"layout": "grid", "columns": 2, "gap": "md"},
                          "children": [
                            {"type": "component", "componentType": "card", "props": {"title": "Card A"}},
                            {"type": "component", "componentType": "card", "props": {"title": "Card B"}}
                          ]
                        }
                      ]
                    }
                    """;

            GenerativeUIResponse result = parser.parse(json);

            assertNotNull(result);
            assertEquals(1, result.getContent().size());

            var container = result.getContent().get(0);
            assertEquals("container", container.getComponentType());
            assertNotNull(container.getChildren());
            assertEquals(2, container.getChildren().size());
            assertEquals("card", container.getChildren().get(0).getComponentType());
            assertEquals("card", container.getChildren().get(1).getComponentType());
        }

        @Test
        @DisplayName("should parse deeply nested containers")
        void shouldParseDeeplyNestedContainers() {
            String json = """
                    {
                      "thinking": [],
                      "content": [
                        {
                          "type": "component",
                          "componentType": "container",
                          "props": {"layout": "stack"},
                          "children": [
                            {
                              "type": "component",
                              "componentType": "container",
                              "props": {"layout": "grid", "columns": 2},
                              "children": [
                                {"type": "component", "componentType": "card", "props": {"title": "Nested Card"}}
                              ]
                            }
                          ]
                        }
                      ]
                    }
                    """;

            GenerativeUIResponse result = parser.parse(json);

            assertNotNull(result);
            var outerContainer = result.getContent().get(0);
            assertNotNull(outerContainer.getChildren());

            var innerContainer = outerContainer.getChildren().get(0);
            assertEquals("container", innerContainer.getComponentType());
            assertNotNull(innerContainer.getChildren());
            assertEquals(1, innerContainer.getChildren().size());
        }
    }

    @Nested
    @DisplayName("GenUI Tag Extraction")
    class GenUITagExtraction {

        @Test
        @DisplayName("should extract JSON from genui tags")
        void shouldExtractJsonFromGenuiTags() {
            String response = """
                    Some preamble text
                    <genui>
                    {
                      "thinking": [],
                      "content": [{"type": "text", "value": "Extracted"}]
                    }
                    </genui>
                    Some trailing text
                    """;

            GenerativeUIResponse result = parser.parse(response);

            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            assertEquals("Extracted", result.getContent().get(0).getValue());
        }

        @Test
        @DisplayName("should handle markdown code blocks")
        void shouldHandleMarkdownCodeBlocks() {
            String response = """
                    ```json
                    {
                      "thinking": [],
                      "content": [{"type": "text", "value": "From markdown"}]
                    }
                    ```
                    """;

            GenerativeUIResponse result = parser.parse(response);

            assertNotNull(result);
            assertEquals("From markdown", result.getContent().get(0).getValue());
        }
    }

    @Nested
    @DisplayName("Fallback Behavior")
    class FallbackBehavior {

        @Test
        @DisplayName("should create fallback response for invalid JSON")
        void shouldCreateFallbackResponseForInvalidJson() {
            String invalidJson = "This is not valid JSON { broken";

            GenerativeUIResponse result = parser.parse(invalidJson);

            // Should return a fallback text response
            assertNotNull(result);
            assertNotNull(result.getContent());
            assertTrue(result.getContent().size() > 0);
        }

          @Test
          @DisplayName("should use default fallback message when tags leave blank content")
          void shouldUseDefaultFallbackMessageWhenTagsLeaveBlankContent() {
            String invalidJson = "<genui></genui>";

            GenerativeUIResponse result = parser.parse(invalidJson);

            assertNotNull(result);
            assertEquals(true, result.getMetadata().get("fallback"));
            assertEquals("I received your request but couldn't format a proper response.",
                result.getContent().get(0).getValue());
          }
        }

        @Nested
        @DisplayName("Partial JSON Parsing")
        class PartialJsonParsing {

          @Test
          @DisplayName("should validate partial JSON shape")
          void shouldValidatePartialJsonShape() {
            assertTrue(parser.isValidPartialJson("{\"content\":[]}"));
            assertFalse(parser.isValidPartialJson("[]"));
            assertFalse(parser.isValidPartialJson("short"));
          }

          @Test
          @DisplayName("should parse partial JSON extracted from genui wrapper")
          void shouldParsePartialJsonFromGenuiWrapper() {
            String streamChunk = "prefix <genui> {\"thinking\":[],\"content\":[{\"type\":\"text\",\"value\":\"Partial\"}]} </genui>";

            GenerativeUIResponse result = parser.tryParsePartial(streamChunk);

            assertNotNull(result);
            assertEquals("Partial", result.getContent().get(0).getValue());
          }

          @Test
          @DisplayName("should repair and parse incomplete JSON")
          void shouldRepairAndParseIncompleteJson() {
            String incomplete = "{\"thinking\":[],\"content\":[{\"type\":\"text\",\"value\":\"X\"}]";

            GenerativeUIResponse result = parser.tryParsePartial(incomplete);

            assertNotNull(result);
            assertEquals("X", result.getContent().get(0).getValue());
          }

          @Test
          @DisplayName("should return null for partial text without JSON object")
          void shouldReturnNullForTextWithoutJsonObject() {
            assertNull(parser.tryParsePartial("streaming words only"));
            assertNull(parser.tryParsePartial(""));
            assertNull(parser.tryParsePartial(null));
          }
    }

    @Nested
    @DisplayName("5 Base Component Types")
    class BaseComponentTypes {

        @Test
        @DisplayName("should parse text component")
        void shouldParseTextComponent() {
            String json = """
                    {"thinking": [], "content": [{"type": "text", "value": "Sample text"}]}
                    """;

            var result = parser.parse(json);
            assertEquals("text", result.getContent().get(0).getType());
        }

        @Test
        @DisplayName("should parse card component")
        void shouldParseCardComponent() {
            String json = """
                    {"thinking": [], "content": [
                      {"type": "component", "componentType": "card", "props": {"title": "Card", "data": {}}}
                    ]}
                    """;

            var result = parser.parse(json);
            assertEquals("card", result.getContent().get(0).getComponentType());
        }

        @Test
        @DisplayName("should parse list component")
        void shouldParseListComponent() {
            String json = """
                    {"thinking": [], "content": [
                      {"type": "component", "componentType": "list", "props": {"title": "List", "items": []}}
                    ]}
                    """;

            var result = parser.parse(json);
            assertEquals("list", result.getContent().get(0).getComponentType());
        }

        @Test
        @DisplayName("should parse table component")
        void shouldParseTableComponent() {
            String json = """
                    {"thinking": [], "content": [
                      {"type": "component", "componentType": "table", "props": {"columns": [], "rows": []}}
                    ]}
                    """;

            var result = parser.parse(json);
            assertEquals("table", result.getContent().get(0).getComponentType());
        }

        @Test
        @DisplayName("should parse container component")
        void shouldParseContainerComponent() {
            String json = """
                    {"thinking": [], "content": [
                      {"type": "component", "componentType": "container", "props": {"layout": "grid"}, "children": []}
                    ]}
                    """;

            var result = parser.parse(json);
            assertEquals("container", result.getContent().get(0).getComponentType());
        }
    }
}
