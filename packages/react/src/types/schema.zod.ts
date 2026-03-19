import { z } from 'zod';

const fogUITextBlockSchema = z.object({
    type: z.literal('text'),
    value: z.string(),
});

const fogUIContentBlockSchema: z.ZodLazy<z.ZodTypeAny> = z.lazy(() =>
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

export const fogUIResponseSchema = z.object({
    thinking: z.array(z.object({
        status: z.string().min(1),
        message: z.string(),
        timestamp: z.string().optional(),
    })),
    content: z.array(fogUIContentBlockSchema),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type FogUIRendererProps = z.infer<typeof fogUIResponseSchema>;
