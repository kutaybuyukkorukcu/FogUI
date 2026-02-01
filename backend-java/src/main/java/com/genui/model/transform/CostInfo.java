package com.genui.model.transform;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Represents cost details for an operation.
 */
@Data
@Builder
public class CostInfo {
    private BigDecimal promptCost;
    private BigDecimal completionCost;
    private BigDecimal totalCost;
    private String currency;
    private String model;
}
