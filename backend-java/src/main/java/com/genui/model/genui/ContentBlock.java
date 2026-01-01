package com.genui.model.genui;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Base content block - aligns with frontend ContentBlock
 * Type should be "text" or "component"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentBlock {

    @JsonProperty("type")
    @Builder.Default
    private String type = "text"; // "text" or "component"

    /**
     * For "text" type: the text value
     * For "component" type: not used (see componentType and props)
     */
    @JsonProperty("value")
    private Object value;

    /**
     * For "component" type: the component type (card, table, chart, etc.)
     */
    @JsonProperty("componentType")
    private String componentType;

    /**
     * For "component" type: the component props
     */
    @JsonProperty("props")
    private Object props;

    /**
     * Create a text block
     */
    public static ContentBlock text(String value) {
        return ContentBlock.builder()
                .type("text")
                .value(value)
                .build();
    }

    /**
     * Create a component block
     */
    public static ContentBlock component(String componentType, Object props) {
        return ContentBlock.builder()
                .type("component")
                .componentType(componentType)
                .props(props)
                .build();
    }
}
