package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismEvaluationCatalog {

    private int defaultRepetitions = 10;
    private List<DeterminismPromptScenario> promptScenarios = new ArrayList<>();
    private List<DeterminismA2UiScenario> compatibilityScenarios = new ArrayList<>();
}