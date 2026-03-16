package com.genui.model.transform;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("StreamPatchOperation")
class StreamPatchOperationTest {

    @Test
    @DisplayName("append factory should create append operation")
    void appendFactoryShouldCreateAppendOperation() {
        StreamPatchOperation op = StreamPatchOperation.append("/content", "hello");

        assertEquals("append", op.getOp());
        assertEquals("/content", op.getPath());
        assertEquals("hello", op.getValue());
    }

    @Test
    @DisplayName("replace factory should create replace operation")
    void replaceFactoryShouldCreateReplaceOperation() {
        StreamPatchOperation op = StreamPatchOperation.replace("/content/0", 42);

        assertEquals("replace", op.getOp());
        assertEquals("/content/0", op.getPath());
        assertEquals(42, op.getValue());
    }

    @Test
    @DisplayName("remove factory should create remove operation without value")
    void removeFactoryShouldCreateRemoveOperationWithoutValue() {
        StreamPatchOperation op = StreamPatchOperation.remove("/content/0");

        assertEquals("remove", op.getOp());
        assertEquals("/content/0", op.getPath());
        assertNull(op.getValue());
    }

    @Test
    @DisplayName("all args and setters should retain values")
    void allArgsAndSettersShouldRetainValues() {
        StreamPatchOperation op = new StreamPatchOperation("replace", "/metadata", "v1");
        assertEquals("replace", op.getOp());
        assertEquals("/metadata", op.getPath());
        assertEquals("v1", op.getValue());

        StreamPatchOperation mutable = new StreamPatchOperation();
        mutable.setOp("append");
        mutable.setPath("/thinking");
        mutable.setValue("item");

        assertEquals("append", mutable.getOp());
        assertEquals("/thinking", mutable.getPath());
        assertEquals("item", mutable.getValue());
    }
}
