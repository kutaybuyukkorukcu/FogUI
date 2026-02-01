package com.genui.service;

import com.genui.model.transform.CostInfo;
import com.genui.model.transform.UsageInfo;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Calculates token costs for LLM models.
 * Prices are per 1 million tokens (as of January 2025).
 * 
 * Supports multiple providers:
 * - OpenAI-compatible (Groq, OpenRouter, OpenAI)
 * - Google Gemini
 */
@Service
public class TokenCostCalculator {

    // Pricing per 1M tokens (input, output) in USD
    private static final Map<String, PricingTier> MODEL_PRICING = Map.ofEntries(
            // === Gemini Models ===
            // Source: https://ai.google.dev/pricing
            Map.entry("gemini-2.5-flash-lite", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30"))),
            Map.entry("gemini-2.5-flash", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60"))),
            Map.entry("gemini-2.5-pro", new PricingTier(new BigDecimal("1.25"), new BigDecimal("5.00"))),
            Map.entry("gemini-2.0-flash", new PricingTier(new BigDecimal("0.10"), new BigDecimal("0.40"))),
            Map.entry("gemini-2.0-flash-lite", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30"))),
            Map.entry("gemini-1.5-flash", new PricingTier(new BigDecimal("0.075"), new BigDecimal("0.30"))),
            Map.entry("gemini-1.5-pro", new PricingTier(new BigDecimal("1.25"), new BigDecimal("5.00"))),

            // === Groq Models (free tier - estimated costs for comparison) ===
            // Source: https://groq.com/pricing/
            Map.entry("llama-3.3-70b-versatile", new PricingTier(new BigDecimal("0.59"), new BigDecimal("0.79"))),
            Map.entry("llama-3.1-70b-versatile", new PricingTier(new BigDecimal("0.59"), new BigDecimal("0.79"))),
            Map.entry("llama-3.1-8b-instant", new PricingTier(new BigDecimal("0.05"), new BigDecimal("0.08"))),
            Map.entry("llama3-70b-8192", new PricingTier(new BigDecimal("0.59"), new BigDecimal("0.79"))),
            Map.entry("llama3-8b-8192", new PricingTier(new BigDecimal("0.05"), new BigDecimal("0.08"))),
            Map.entry("mixtral-8x7b-32768", new PricingTier(new BigDecimal("0.24"), new BigDecimal("0.24"))),
            Map.entry("gemma2-9b-it", new PricingTier(new BigDecimal("0.20"), new BigDecimal("0.20"))),

            // === OpenAI Models ===
            // Source: https://openai.com/pricing
            Map.entry("gpt-4o", new PricingTier(new BigDecimal("2.50"), new BigDecimal("10.00"))),
            Map.entry("gpt-4o-mini", new PricingTier(new BigDecimal("0.15"), new BigDecimal("0.60"))),
            Map.entry("gpt-4-turbo", new PricingTier(new BigDecimal("10.00"), new BigDecimal("30.00"))),
            Map.entry("gpt-3.5-turbo", new PricingTier(new BigDecimal("0.50"), new BigDecimal("1.50"))),

            // === OpenRouter Models (popular ones) ===
            Map.entry("meta-llama/llama-3.3-70b-instruct", new PricingTier(new BigDecimal("0.40"), new BigDecimal("0.40"))),
            Map.entry("anthropic/claude-3.5-sonnet", new PricingTier(new BigDecimal("3.00"), new BigDecimal("15.00"))),
            Map.entry("anthropic/claude-3-haiku", new PricingTier(new BigDecimal("0.25"), new BigDecimal("1.25")))
    );

    // Default pricing for unknown models (conservative estimate)
    private static final PricingTier DEFAULT_PRICING = new PricingTier(
            new BigDecimal("0.50"),
            new BigDecimal("1.50"));

    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");

    /**
     * Calculate cost for a given usage.
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
            return "llama-3.3-70b-versatile"; // Default model (Groq)
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
