package com.genui.evaluation;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "fogui.evaluation")
public class DeterminismEvaluationProperties {

    private boolean enabled = false;
    private int repetitions = 10;
    private String catalogLocation = "classpath:evaluation/determinism-catalog.json";
    private String outputDir = "target/determinism-evaluation";
    private boolean applyDeterministicOptionsToBaselines = true;
    private boolean includeCompatibilityFixtures = true;
}