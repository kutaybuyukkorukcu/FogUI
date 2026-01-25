package com.genui.service;

import com.genui.model.openai.CostInfo;
import com.genui.model.openai.UsageInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TokenCostCalculator.
 * Tests cost calculation logic for Gemini models.
 */
@DisplayName("TokenCostCalculator")
class TokenCostCalculatorTest {

    private TokenCostCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new TokenCostCalculator();
    }

    @Nested
    @DisplayName("calculateCost")
    class CalculateCost {

        @Test
        @DisplayName("should calculate cost for gemini-2.5-flash-lite")
        void shouldCalculateCostForGeminiFlashLite() {
            // gemini-2.5-flash-lite: $0.075/1M input, $0.30/1M output
            CostInfo cost = calculator.calculateCost("gemini-2.5-flash-lite", 1000000, 500000);

            assertNotNull(cost);
            assertEquals("USD", cost.getCurrency());
            assertEquals("gemini-2.5-flash-lite", cost.getModel());

            // 1M tokens * $0.075 / 1M = $0.075
            assertEquals(0, new BigDecimal("0.075000").compareTo(cost.getPromptCost()));
            // 500K tokens * $0.30 / 1M = $0.15
            assertEquals(0, new BigDecimal("0.150000").compareTo(cost.getCompletionCost()));
            // Total = $0.225
            assertEquals(0, new BigDecimal("0.225000").compareTo(cost.getTotalCost()));
        }

        @Test
        @DisplayName("should calculate cost for gemini-2.5-pro")
        void shouldCalculateCostForGeminiPro() {
            // gemini-2.5-pro: $1.25/1M input, $5.00/1M output
            CostInfo cost = calculator.calculateCost("gemini-2.5-pro", 100000, 50000);

            assertNotNull(cost);
            // 100K * $1.25 / 1M = $0.125
            assertEquals(0, new BigDecimal("0.125000").compareTo(cost.getPromptCost()));
            // 50K * $5.00 / 1M = $0.25
            assertEquals(0, new BigDecimal("0.250000").compareTo(cost.getCompletionCost()));
        }

        @Test
        @DisplayName("should use default pricing for unknown Gemini model")
        void shouldUseDefaultPricingForUnknownGeminiModel() {
            // Default: $0.15/1M input, $0.60/1M output
            CostInfo cost = calculator.calculateCost("gemini-3.0-ultra", 1000000, 1000000);

            assertNotNull(cost);
            assertEquals(0, new BigDecimal("0.150000").compareTo(cost.getPromptCost()));
            assertEquals(0, new BigDecimal("0.600000").compareTo(cost.getCompletionCost()));
        }

        @Test
        @DisplayName("should handle zero tokens")
        void shouldHandleZeroTokens() {
            CostInfo cost = calculator.calculateCost("gemini-2.5-flash-lite", 0, 0);

            assertNotNull(cost);
            assertEquals(0, BigDecimal.ZERO.compareTo(cost.getPromptCost()));
            assertEquals(0, BigDecimal.ZERO.compareTo(cost.getCompletionCost()));
            assertEquals(0, BigDecimal.ZERO.compareTo(cost.getTotalCost()));
        }

        @Test
        @DisplayName("should handle case-insensitive model names")
        void shouldHandleCaseInsensitiveModelNames() {
            CostInfo cost1 = calculator.calculateCost("GEMINI-2.5-FLASH-LITE", 1000, 500);
            CostInfo cost2 = calculator.calculateCost("gemini-2.5-flash-lite", 1000, 500);

            assertEquals(cost1.getTotalCost(), cost2.getTotalCost());
        }

        @Test
        @DisplayName("should default to gemini-2.5-flash-lite for null model")
        void shouldDefaultForNullModel() {
            CostInfo cost = calculator.calculateCost(null, 1000, 500);

            assertNotNull(cost);
            assertEquals("gemini-2.5-flash-lite", cost.getModel());
        }
    }

    @Nested
    @DisplayName("buildUsageInfo")
    class BuildUsageInfo {

        @Test
        @DisplayName("should build complete usage info with cost")
        void shouldBuildCompleteUsageInfoWithCost() {
            UsageInfo usage = calculator.buildUsageInfo("gemini-2.5-flash", 1000, 500);

            assertNotNull(usage);
            assertEquals(1000, usage.getPromptTokens());
            assertEquals(500, usage.getCompletionTokens());
            assertEquals(1500, usage.getTotalTokens());
            assertNotNull(usage.getEstimatedCost());
            assertEquals("USD", usage.getEstimatedCost().getCurrency());
        }

        @Test
        @DisplayName("should calculate total tokens correctly")
        void shouldCalculateTotalTokensCorrectly() {
            UsageInfo usage = calculator.buildUsageInfo("gemini-2.0-flash", 2500, 1500);

            assertEquals(4000, usage.getTotalTokens());
            assertEquals(2500, usage.getPromptTokens());
            assertEquals(1500, usage.getCompletionTokens());
        }
    }

    @Nested
    @DisplayName("estimateTokenCount")
    class EstimateTokenCount {

        @Test
        @DisplayName("should estimate token count from text length")
        void shouldEstimateTokenCountFromTextLength() {
            // ~4 characters per token
            String text = "This is a test sentence with exactly forty characters.";
            int tokens = TokenCostCalculator.estimateTokenCount(text);

            // 54 chars / 4 = ~14 tokens
            assertTrue(tokens > 0);
            assertEquals(14, tokens);
        }

        @Test
        @DisplayName("should return zero for null input")
        void shouldReturnZeroForNullInput() {
            assertEquals(0, TokenCostCalculator.estimateTokenCount(null));
        }

        @Test
        @DisplayName("should return zero for empty string")
        void shouldReturnZeroForEmptyString() {
            assertEquals(0, TokenCostCalculator.estimateTokenCount(""));
        }

        @Test
        @DisplayName("should round up token estimate")
        void shouldRoundUpTokenEstimate() {
            // 5 characters / 4 = 1.25, should round up to 2
            String text = "Hello";
            int tokens = TokenCostCalculator.estimateTokenCount(text);

            assertEquals(2, tokens);
        }
    }
}
