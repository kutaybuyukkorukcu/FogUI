package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Cost breakdown for the request
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CostInfo {

    @JsonProperty("prompt_cost")
    private BigDecimal promptCost;

    @JsonProperty("completion_cost")
    private BigDecimal completionCost;

    @JsonProperty("total_cost")
    private BigDecimal totalCost;

    @JsonProperty("currency")
    @Builder.Default
    private String currency = "USD";

    @JsonProperty("model")
    @Builder.Default
    private String model = "";
}
