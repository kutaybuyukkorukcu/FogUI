import { z } from 'zod';

// This is a placeholder that will be replaced by the real schema
const fogUIComponentSchema: z.ZodLazy<any> = z.lazy(() => z.union([
    cardComponentSchema,
    tableComponentSchema,
    listComponentSchema,
    formComponentSchema,
    inputComponentSchema,
    buttonComponentSchema,
    stackComponentSchema,
    gridComponentSchema,
    tabsComponentSchema,
    badgeComponentSchema,
]));

const baseComponentSchema = z.object({
    type: z.literal('component'),
    props: z.record(z.string(), z.unknown()),
});

const cardComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Card'),
    props: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
    }).catchall(z.unknown()),
    children: z.array(fogUIComponentSchema).optional(),
});

const tableComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Table'),
    props: z.object({
        headers: z.array(z.string()),
        rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))),
    }).catchall(z.unknown()),
});

const listComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('List'),
    props: z.object({
        items: z.array(z.string()),
        ordered: z.boolean().optional(),
    }).catchall(z.unknown()),
});

const inputComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Input'),
    props: z.object({
        label: z.string().optional(),
        placeholder: z.string().optional(),
        type: z.enum(['text', 'number', 'password']).optional(),
    }).catchall(z.unknown()),
});

const buttonComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Button'),
    props: z.object({
        label: z.string(),
        action: z.string(),
    }).catchall(z.unknown()),
});

const formComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Form'),
    props: z.object({}).catchall(z.unknown()),
    children: z.array(z.union([inputComponentSchema, buttonComponentSchema])).optional(),
});

const stackComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Stack'),
    props: z.object({
        direction: z.enum(['horizontal', 'vertical']).optional(),
        gap: z.number().optional(),
    }).catchall(z.unknown()),
    children: z.array(fogUIComponentSchema).optional(),
});

const gridComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Grid'),
    props: z.object({
        columns: z.number().optional(),
        gap: z.number().optional(),
    }).catchall(z.unknown()),
    children: z.array(fogUIComponentSchema).optional(),
});

const tabPaneComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('TabPane'),
    props: z.object({
        title: z.string(),
    }).catchall(z.unknown()),
    children: z.array(fogUIComponentSchema).optional(),
});

const tabsComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Tabs'),
    props: z.object({}).catchall(z.unknown()),
    children: z.array(tabPaneComponentSchema).optional(),
});

const badgeComponentSchema = baseComponentSchema.extend({
    componentType: z.literal('Badge'),
    props: z.object({
        label: z.string(),
        color: z.enum(['red', 'green', 'blue', 'yellow', 'gray']).optional(),
    }).catchall(z.unknown()),
});

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
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type FogUIRendererProps = z.infer<typeof fogUIResponseSchema>;
