import { z } from 'zod';

export const fogUITextBlockSchema = z.object({
    type: z.literal('text'),
    value: z.string(),
});

export const fogUIContentBlockSchema: z.ZodLazy<z.ZodTypeAny> = z.lazy(() =>
    z.union([
        fogUITextBlockSchema,
        z.object({
            type: z.literal('component'),
            componentType: z.string().min(1),
            props: z.record(z.string(), z.unknown()).nullable().optional(),
            children: z.array(fogUIContentBlockSchema).nullable().optional(),
        }),
    ])
);

export const fogUIThinkingItemSchema = z.object({
    status: z.string().min(1),
    message: z.string(),
    timestamp: z.string().nullable().optional(),
});

export const fogUIResponseMetadataSchema = z.object({
    contractVersion: z.string().optional(),
    modelUsed: z.string().optional(),
    queryType: z.string().optional(),
    timestamp: z.string().optional(),
    version: z.string().optional(),
}).catchall(z.unknown()).nullable().optional();

export const fogUIResponseSchema = z.object({
    thinking: z.array(fogUIThinkingItemSchema),
    content: z.array(fogUIContentBlockSchema),
    metadata: fogUIResponseMetadataSchema,
});

export const fogUITransformUsageSchema = z.object({
    transformTokens: z.number().optional(),
    model: z.string().optional(),
    estimatedCost: z.number().optional(),
    processingTimeMs: z.number().optional(),
}).catchall(z.unknown());

export const fogUITransformResultSchema = z.object({
    success: z.boolean(),
    result: fogUIResponseSchema.optional(),
    error: z.string().optional(),
    usage: fogUITransformUsageSchema.optional(),
}).superRefine((value, context) => {
    if (value.success && !value.result) {
        context.addIssue({
            code: 'custom',
            path: ['result'],
            message: 'Successful transform responses must include a result payload.',
        });
    }

    if (!value.success && !value.error && !value.result) {
        context.addIssue({
            code: 'custom',
            path: ['error'],
            message: 'Failed transform responses must include an error or result payload.',
        });
    }
});

export const fogUIStreamUsageSchema = z.object({
    transformTokens: z.number().optional(),
    processingTimeMs: z.number().optional(),
}).catchall(z.unknown());

export const fogUIStreamErrorSchema = z.object({
    error: z.string(),
}).catchall(z.unknown());

export type FogUIResponseSchemaType = z.infer<typeof fogUIResponseSchema>;
