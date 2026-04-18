package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismA2UiScenario {

    private String id;
    private String title;
    private String summary;
    private String expected;
    private List<String> focusComponents = new ArrayList<>();
    private Map<String, Object> payload = new LinkedHashMap<>();
    private boolean publicationCandidate;
}