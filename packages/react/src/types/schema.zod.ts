import { z } from 'zod';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeThinkingItem(value: unknown): { status: string; message: string; timestamp?: string } {
    if (!isRecord(value)) {
        return {
            status: 'complete',
            message: value == null ? '' : String(value),
        };
    }

    const status = typeof value.status === 'string' && value.status.trim().length > 0
        ? value.status.trim()
        : 'complete';
    let message = '';
    if (typeof value.message === 'string') {
        message = value.message;
    } else if (value.message != null) {
        message = String(value.message);
    }
    const timestamp = typeof value.timestamp === 'string' && value.timestamp.trim().length > 0
        ? value.timestamp
        : undefined;

    return { status, message, timestamp };
}

function normalizeComponentType(value: unknown): string {
    if (typeof value !== 'string') {
        return 'unknown';
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : 'unknown';
}

function normalizeTextBlock(value: unknown): UnknownRecord {
    const rawValue = isRecord(value) ? value.value : value;
    return {
        type: 'text',
        value: rawValue == null ? '' : String(rawValue),
    };
}

function normalizeComponentBlock(value: unknown): UnknownRecord {
    const block = isRecord(value) ? value : {};
    const rawProps = isRecord(block.props) ? block.props : {};
    const propsChildren = rawProps.children;
    const propsWithoutChildren = Object.fromEntries(
        Object.entries(rawProps).filter(([key]) => key !== 'children')
    );

    let childrenSource: unknown = [];
    if (Array.isArray(block.children)) {
        childrenSource = block.children;
    } else if (Array.isArray(propsChildren) || isRecord(propsChildren)) {
        childrenSource = propsChildren;
    }

    const normalizedChildren = normalizeContentBlocks(childrenSource);

    return {
        type: 'component',
        componentType: normalizeComponentType(block.componentType),
        props: propsWithoutChildren,
        ...(normalizedChildren.length > 0 ? { children: normalizedChildren } : {}),
    };
}

function normalizeContentBlock(value: unknown): UnknownRecord {
    if (!isRecord(value)) {
        return normalizeTextBlock(value);
    }

    const explicitType = typeof value.type === 'string' ? value.type.trim().toLowerCase() : '';
    if (explicitType === 'component' || (typeof value.componentType === 'string' && value.componentType.trim().length > 0)) {
        return normalizeComponentBlock(value);
    }

    return normalizeTextBlock(value);
}

function normalizeContentBlocks(value: unknown): UnknownRecord[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => normalizeContentBlock(item));
}

export function normalizeFogUIResponse(value: unknown): UnknownRecord {
    const root = isRecord(value) ? value : {};
    const thinking = Array.isArray(root.thinking)
        ? root.thinking.map((item) => normalizeThinkingItem(item))
        : [];
    const content = normalizeContentBlocks(root.content);

    const normalized: UnknownRecord = {
        thinking,
        content,
    };

    if (root.metadata === null) {
        normalized.metadata = null;
    } else if (isRecord(root.metadata)) {
        normalized.metadata = root.metadata;
    }

    return normalized;
}

const fogUITextBlockSchema = z.object({
    type: z.literal('text'),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).transform((value) =>
        value == null ? '' : String(value)
    ),
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

export const fogUIResponseSchema = z.preprocess(normalizeFogUIResponse, z.object({
    thinking: z.array(z.object({
        status: z.string().min(1),
        message: z.string(),
        timestamp: z.string().optional(),
    })),
    content: z.array(fogUIContentBlockSchema),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}));

export type FogUIRendererProps = z.infer<typeof fogUIResponseSchema>;
