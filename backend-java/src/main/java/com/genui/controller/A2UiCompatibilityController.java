package com.genui.controller;

import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.contract.a2ui.A2UiInboundTranslator;
import com.genui.contract.a2ui.A2UiTranslationResult;
import com.genui.service.RequestCorrelationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Compatibility endpoints for translating external protocol payloads into FogUI canonical output.
 */
@RestController
@RequestMapping("/fogui/compat")
@RequiredArgsConstructor
@Tag(name = "Compatibility", description = "Compatibility endpoints for protocol translation")
public class A2UiCompatibilityController {

    private final A2UiInboundTranslator a2UiInboundTranslator;
    private final FogUiCanonicalValidator fogUiCanonicalValidator;
    private final RequestCorrelationService requestCorrelationService;

    @PostMapping("/a2ui/inbound")
    @Operation(summary = "Translate A2UI payload into FogUI canonical response")
    public ResponseEntity<Map<String, Object>> translateInboundA2Ui(
            @RequestHeader(value = RequestCorrelationService.REQUEST_ID_HEADER, required = false) String requestIdHeader,
            @RequestBody Map<String, Object> payload
    ) {
        String requestId = requestCorrelationService.resolveRequestId(requestIdHeader);
        A2UiTranslationResult translation = a2UiInboundTranslator.translate(payload);
        List<CanonicalValidationError> validationErrors = fogUiCanonicalValidator.validate(
                translation.getResponse(),
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());

        boolean success = translation.getErrors().isEmpty() && validationErrors.isEmpty();
        return ResponseEntity.ok()
                .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                .body(Map.of(
                        "success", success,
                        "requestId", requestId,
                        "result", translation.getResponse(),
                        "translationErrors", translation.getErrors(),
                        "validationErrors", validationErrors
                ));
    }
}
