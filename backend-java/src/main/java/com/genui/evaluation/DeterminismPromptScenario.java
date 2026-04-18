package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismPromptScenario {

    private String id;
    private String title;
    private String summary;
    private String prompt;
    private String intent;
    private List<String> preferredComponents = new ArrayList<>();
    private String instructions;
    private List<String> focusComponents = new ArrayList<>();
    private boolean publicationCandidate;
}