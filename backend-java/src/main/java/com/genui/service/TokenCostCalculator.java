package com.genui.service;

import com.genui.model.transform.CostInfo;
import com.genui.model.transform.UsageInfo;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Calculates token costs for Gemini models.
 * Prices are per 1 million tokens (as of January 2025).
 * 
 * FogUI backend uses Gemini exclusively - this calculator
 * is simplified to only support Gemini model pricing.
 */
@Service
public class TokenCostCalculator {

    // Gemini pricing per 1M tokens (input, output) in USD
    // Source: https://ai.google.dev/pricing
    private static final Map<String, PricingTier> GEMINI_PRICING = Map.of(
            // Gemini 2.5 models
            "gemini-2.5-flash-lite", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30")),
            "gemini-2.5-flash", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60")),
            "gemini-2.5-pro", new PricingTier(new BigDecimal("1.25"), new BigDecimal("5.00")),

            // Gemini 2.0 models
            "gemini-2.0-flash", new PricingTier(new BigDecimal("0.10"), new BigDecimal("0.40")),
            "gemini-2.0-flash-lite", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30")),

            // Gemini 1.5 models (legacy)
            "gemini-1.5-flash", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30")),
            "gemini-1.5-pro", new PricingTier(new BigDecimal("1.25"), new BigDecimal("5.00")));

    // Default pricing for unknown Gemini models
    private static final PricingTier DEFAULT_PRICING = new PricingTier(
            new BigDecimal("0.15"), // Conservative estimate
            new BigDecimal("0.60"));

    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    /**
     * Calculate cost for a given usage.
     */
    public CostInfo calculateCost(String model, int promptTokens, int completionTokens) {
        var normalizedModel = normalizeModelName(model);
        var pricing = GEMINI_PRICING.getOrDefault(normalizedModel, DEFAULT_PRICING);

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
     * Build complete usage info with cost.
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
     * Normalize model name for pricing lookup.
     */
    private String normalizeModelName(String model) {
        if (model == null || model.isBlank()) {
            return "gemini-2.5-flash-lite"; // Default model
        }
        return model.toLowerCase().trim();
    }

    /**
     * Estimate token count for a string (rough approximation: ~4 chars per token
     * for English).
     * This is used when we can't get actual token counts from the API.
     */
    public static int estimateTokenCount(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        // Rough estimation: ~4 characters per token for English text
        return (int) Math.ceil(text.length() / 4.0);
    }

    private record PricingTier(BigDecimal input, BigDecimal output) {
    }
}
