package com.genui.evaluation;

public final class DeterminismEvaluationPrompts {

    public static final String DIRECT_A2UI_SYSTEM_PROMPT = """
            You are an interface protocol generation engine.

            Return one JSON object only. Do not add markdown fences or commentary.

            Emit a conservative A2UI-like structure with this shape:

            - optional `thinking`: array of objects with `message`, optional `status`, optional `timestamp`
            - required `content`: array of nodes
            - text node: `{"type":"text","value":"..."}`
            - component node: `{"type":"component","componentType":"Card","props":{...},"children":[...]}`
            - component nodes may also use `name` instead of `componentType`

            Keep the structure compact and valid JSON.
            """;

    private DeterminismEvaluationPrompts() {
    }

    public static String buildDirectA2UiPrompt(String content, String contextHints) {
        StringBuilder builder = new StringBuilder();
        builder.append("Transform the following user intent into an A2UI-like JSON object:\n\n");
        builder.append("---\n");
        builder.append(content);
        builder.append("\n---\n\n");

        if (contextHints != null && !contextHints.isBlank()) {
            builder.append("Additional context: ").append(contextHints).append("\n\n");
        }

        builder.append("Return JSON only. Prefer stable field names and explicit component blocks.");
        return builder.toString();
    }
}