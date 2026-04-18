package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DeterminismEvaluationCatalogLoader {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    public DeterminismEvaluationCatalog load(String location) {
        Resource resource = resourceLoader.getResource(Objects.requireNonNull(location));
        if (!resource.exists()) {
            throw new IllegalArgumentException("Determinism evaluation catalog not found: " + location);
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readValue(inputStream, DeterminismEvaluationCatalog.class);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load determinism evaluation catalog from " + location, ex);
        }
    }
}