package com.genui.evaluation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "fogui.evaluation", name = "enabled", havingValue = "true")
public class DeterminismEvaluationApplicationRunner implements ApplicationRunner {

    private final DeterminismEvaluationService determinismEvaluationService;

    @Override
    public void run(ApplicationArguments args) {
        Path reportDirectory = determinismEvaluationService.runEvaluation();
        log.info("Determinism evaluation report written to {}", reportDirectory.toAbsolutePath());
    }
}