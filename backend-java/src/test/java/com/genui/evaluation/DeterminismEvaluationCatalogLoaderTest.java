package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("DeterminismEvaluationCatalogLoader")
class DeterminismEvaluationCatalogLoaderTest {

    @Test
    void shouldLoadDefaultCatalog() {
        DeterminismEvaluationCatalogLoader loader = new DeterminismEvaluationCatalogLoader(
                new ObjectMapper(),
                new DefaultResourceLoader());

        DeterminismEvaluationCatalog catalog = loader.load("classpath:evaluation/determinism-catalog.json");

        assertEquals(10, catalog.getDefaultRepetitions());
        assertEquals(11, catalog.getPromptScenarios().size());
        assertEquals(4, catalog.getCompatibilityScenarios().size());
        assertTrue(catalog.getPromptScenarios().stream().anyMatch(DeterminismPromptScenario::isPublicationCandidate));
        assertFalse(catalog.getCompatibilityScenarios().isEmpty());
    }
}