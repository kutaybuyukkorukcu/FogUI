package com.fogui.examples.springconsumer;

import com.genui.contract.CanonicalOutboundMapper;
import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CanonicalDemoService {

    private final FogUiCanonicalValidator canonicalValidator;
    private final CanonicalOutboundMapper outboundMapper;

    public CanonicalDemoService(
            FogUiCanonicalValidator canonicalValidator,
            CanonicalOutboundMapper outboundMapper
    ) {
        this.canonicalValidator = canonicalValidator;
        this.outboundMapper = outboundMapper;
    }

    public Map<String, Object> greetingPayload(String greeting) {
        GenerativeUIResponse response = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text(greeting)))
                .build();

        FogUiCanonicalContract.ensureContractVersionMetadata(response);
        List<CanonicalValidationError> diagnostics = canonicalValidator.validate(
                response,
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());

        if (!diagnostics.isEmpty()) {
            throw new IllegalStateException("FogUI canonical validation failed: " + diagnostics);
        }

        return outboundMapper.toRendererPayload(response);
    }
}