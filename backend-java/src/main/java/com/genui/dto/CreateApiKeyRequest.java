package com.genui.dto;

import lombok.Data;

@Data
public class CreateApiKeyRequest {
    private String name;
    private boolean testMode = false;
}
