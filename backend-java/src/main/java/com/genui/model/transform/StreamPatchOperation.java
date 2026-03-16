package com.genui.model.transform;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Incremental UI patch operation for stream updates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StreamPatchOperation {

    @JsonProperty("op")
    private String op;

    @JsonProperty("path")
    private String path;

    @JsonProperty("value")
    private Object value;

    public static StreamPatchOperation append(String path, Object value) {
        return StreamPatchOperation.builder()
                .op("append")
                .path(path)
                .value(value)
                .build();
    }

    public static StreamPatchOperation replace(String path, Object value) {
        return StreamPatchOperation.builder()
                .op("replace")
                .path(path)
                .value(value)
                .build();
    }

    public static StreamPatchOperation remove(String path) {
        return StreamPatchOperation.builder()
                .op("remove")
                .path(path)
                .build();
    }
}
