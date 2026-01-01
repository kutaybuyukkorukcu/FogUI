package com.genui.service;

import com.genui.model.openai.CostInfo;
import com.genui.model.openai.UsageInfo;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Calculates token costs for various LLM models.
 * Prices are per 1 million tokens (as of December 2024).
 */
@Service
public class TokenCostCalculator {

    // Pricing per 1M tokens (input, output) in USD
    private static final Map<String, PricingTier> MODEL_PRICING = Map.ofEntries(
            // OpenAI models
            Map.entry("gpt-4o", new PricingTier(new BigDecimal("2.50"), new BigDecimal("10.00"))),
            Map.entry("gpt-4o-2024-11-20", new PricingTier(new BigDecimal("2.50"), new BigDecimal("10.00"))),
            Map.entry("gpt-4o-2024-08-06", new PricingTier(new BigDecimal("2.50"), new BigDecimal("10.00"))),
            Map.entry("gpt-4o-mini", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60"))),
            Map.entry("gpt-4o-mini-2024-07-18", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60"))),
            Map.entry("gpt-4-turbo", new PricingTier(new BigDecimal("10.00"), new BigDecimal("30.00"))),
            Map.entry("gpt-4-turbo-preview", new PricingTier(new BigDecimal("10.00"), new BigDecimal("30.00"))),
            Map.entry("gpt-4", new PricingTier(new BigDecimal("30.00"), new BigDecimal("60.00"))),
            Map.entry("gpt-4-32k", new PricingTier(new BigDecimal("60.00"), new BigDecimal("120.00"))),
            Map.entry("gpt-3.5-turbo", new PricingTier(new BigDecimal("0.50"), new BigDecimal("1.50"))),
            Map.entry("gpt-3.5-turbo-16k", new PricingTier(new BigDecimal("3.00"), new BigDecimal("4.00"))),

            // Azure OpenAI (same as OpenAI for standard deployments)
            Map.entry("gpt-4.1-mini", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60"))),
            Map.entry("gpt-4.1", new PricingTier(new BigDecimal("2.50"), new BigDecimal("10.00"))),

            // o1 models (reasoning)
            Map.entry("o1-preview", new PricingTier(new BigDecimal("15.00"), new BigDecimal("60.00"))),
            Map.entry("o1-mini", new PricingTier(new BigDecimal("3.00"), new BigDecimal("12.00"))),

            // Claude models (for future support)
            Map.entry("claude-3-5-sonnet-20241022", new PricingTier(new BigDecimal("3.00"), new BigDecimal("15.00"))),
            Map.entry("claude-3-5-haiku-20241022", new PricingTier(new BigDecimal("0.80"), new BigDecimal("4.00"))),
            Map.entry("claude-3-opus-20240229", new PricingTier(new BigDecimal("15.00"), new BigDecimal("75.00")))
    );

    // Default pricing for unknown models (conservative estimate)
    private static final PricingTier DEFAULT_PRICING = new PricingTier(
            new BigDecimal("1.00"),
            new BigDecimal("3.00")
    );

    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    /**
     * Calculate cost for a given usage
     */
    public CostInfo calculateCost(String model, int promptTokens, int completionTokens) {
        var normalizedModel = normalizeModelName(model);
        var pricing = MODEL_PRICING.getOrDefault(normalizedModel, DEFAULT_PRICING);

        // Calculate cost (pricing is per 1M tokens)
        var promptCost = new BigDecimal(promptTokens)
                .divide(ONE_MILLION, 10, RoundingMode.HALF_UP)
                .multiply(pricing.input());

        var completionCost = new BigDecimal(completionTokens)
                .divide(ONE_MILLION, 10, RoundingMode.HALF_UP)
                .multiply(pricing.output());

        return CostInfo.builder()
                .promptCost(promptCost.setScale(6, RoundingMode.HALF_UP))
                .completionCost(completionCost.setScale(6, RoundingMode.HALF_UP))
                .totalCost(promptCost.add(completionCost).setScale(6, RoundingMode.HALF_UP))
                .currency("USD")
                .model(normalizedModel)
                .build();
    }

    /**
     * Build complete usage info with cost
     */
    public UsageInfo buildUsageInfo(String model, int promptTokens, int completionTokens) {
        return UsageInfo.builder()
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(promptTokens + completionTokens)
                .estimatedCost(calculateCost(model, promptTokens, completionTokens))
                .build();
    }

    /**
     * Normalize model name for pricing lookup
     */
    private String normalizeModelName(String model) {
        // Handle Azure deployment names that might differ
        var normalized = model.toLowerCase().trim();

        // Common Azure deployment name mappings
        if (normalized.contains("gpt-4o-mini") || normalized.contains("gpt-4.1-mini")) {
            return "gpt-4o-mini";
        }
        if (normalized.contains("gpt-4o") || normalized.contains("gpt-4.1")) {
            return "gpt-4o";
        }
        if (normalized.contains("gpt-4-turbo")) {
            return "gpt-4-turbo";
        }
        if (normalized.contains("gpt-4-32k")) {
            return "gpt-4-32k";
        }
        if (normalized.contains("gpt-4")) {
            return "gpt-4";
        }
        if (normalized.contains("gpt-3.5-turbo-16k")) {
            return "gpt-3.5-turbo-16k";
        }
        if (normalized.contains("gpt-3.5")) {
            return "gpt-3.5-turbo";
        }

        return normalized;
    }

    /**
     * Estimate token count for a string (rough approximation: ~4 chars per token for English)
     * This is used when we can't get actual token counts from the API
     */
    public static int estimateTokenCount(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }

        // Rough estimation: ~4 characters per token for English text
        // This is a simplification - actual tokenization varies by model
        return (int) Math.ceil(text.length() / 4.0);
    }

    private record PricingTier(BigDecimal input, BigDecimal output) {
    }
}
