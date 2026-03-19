package com.genui.contract;

import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic validator for canonical FogUI payloads.
 */
public class FogUiCanonicalValidator {

    public List<CanonicalValidationError> validate(GenerativeUIResponse response) {
        List<CanonicalValidationError> errors = new ArrayList<>();
        if (response == null) {
            errors.add(error("$", "NULL_RESPONSE", "Response must not be null"));
            return errors;
        }

        if (response.getThinking() == null) {
            errors.add(error("$.thinking", "MISSING_THINKING", "thinking must be an array"));
        }

        if (response.getContent() == null) {
            errors.add(error("$.content", "MISSING_CONTENT", "content must be an array"));
            return errors;
        }

        for (int i = 0; i < response.getContent().size(); i++) {
            validateBlock(response.getContent().get(i), "$.content[" + i + "]", errors);
        }

        return errors;
    }

    public boolean isValid(GenerativeUIResponse response) {
        return validate(response).isEmpty();
    }

    private void validateBlock(ContentBlock block, String path, List<CanonicalValidationError> errors) {
        if (block == null) {
            errors.add(error(path, "NULL_BLOCK", "content block must not be null"));
            return;
        }

        if (block.getType() == null || block.getType().isBlank()) {
            errors.add(error(path + ".type", "MISSING_TYPE", "type is required"));
            return;
        }

        if ("text".equals(block.getType())) {
            if (!(block.getValue() instanceof String)) {
                errors.add(error(path + ".value", "INVALID_TEXT_VALUE", "text block value must be a string"));
            }
            return;
        }

        if ("component".equals(block.getType())) {
            if (block.getComponentType() == null || block.getComponentType().isBlank()) {
                errors.add(error(path + ".componentType", "MISSING_COMPONENT_TYPE", "componentType is required"));
            }

            if (block.getProps() != null && !(block.getProps() instanceof java.util.Map)) {
                errors.add(error(path + ".props", "INVALID_PROPS", "props must be an object when provided"));
            }

            if (block.getChildren() != null) {
                for (int i = 0; i < block.getChildren().size(); i++) {
                    validateBlock(block.getChildren().get(i), path + ".children[" + i + "]", errors);
                }
            }
            return;
        }

        errors.add(error(path + ".type", "UNSUPPORTED_TYPE", "type must be 'text' or 'component'"));
    }

    private CanonicalValidationError error(String path, String code, String message) {
        return CanonicalValidationError.builder()
                .path(path)
                .code(code)
                .message(message)
                .build();
    }
}
