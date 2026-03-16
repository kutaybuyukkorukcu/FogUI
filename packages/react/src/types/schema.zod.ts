import { z } from 'zod';

const fogUIComponentSchema: z.ZodLazy<z.ZodTypeAny> = z.lazy(() =>
    z.object({
        type: z.literal('component'),
        componentType: z.string().min(1),
        props: z.record(z.string(), z.unknown()),
        children: z.union([z.array(fogUIComponentSchema), z.null()]).optional(),
    })
);

export const fogUIResponseSchema = z.object({
    thinking: z.array(z.object({
        status: z.enum(['active', 'complete']),
        message: z.string(),
        timestamp: z.string().optional(),
    })),
    content: z.array(z.union([
        z.object({
            type: z.literal('text'),
            value: z.string(),
        }),
        fogUIComponentSchema,
    ])),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type FogUIRendererProps = z.infer<typeof fogUIResponseSchema>;
