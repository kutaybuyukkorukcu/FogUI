import { describe, expect, it } from 'vitest';
import {
  fogUIResponseSchema,
  fogUIStreamErrorSchema,
  fogUIStreamUsageSchema,
  fogUITransformResultSchema,
} from '../types/schema.zod';

describe('fogUIResponseSchema', () => {
  it('accepts a canonical response with text and component blocks', () => {
    const payload = {
      thinking: [{ status: 'complete', message: 'done' }],
      content: [
        { type: 'text', value: 'hello' },
        {
          type: 'component',
          componentType: 'card',
          props: { title: 'Card title' },
        },
      ],
      metadata: { modelUsed: 'test-model' },
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts nested component blocks with children', () => {
    const payload = {
      thinking: [{ status: 'complete', message: 'done' }],
      content: [
        {
          type: 'component',
          componentType: 'container',
          props: { layout: 'grid', columns: 2 },
          children: [
            {
              type: 'component',
              componentType: 'card',
              props: { title: 'Card A' },
            },
            {
              type: 'component',
              componentType: 'card',
              props: { title: 'Card B' },
            },
          ],
        },
      ],
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts deeply nested component trees', () => {
    const payload = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Tabs',
          props: {},
          children: [
            {
              type: 'component',
              componentType: 'TabPane',
              props: { title: 'General' },
              children: [
                {
                  type: 'component',
                  componentType: 'Form',
                  props: { id: 'profile-form' },
                  children: [
                    {
                      type: 'component',
                      componentType: 'Input',
                      props: { type: 'text', label: 'Name' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects a response with missing required fields', () => {
    const missingThinking = { content: [{ type: 'text', value: 'hi' }] };
    const missingContent = { thinking: [{ status: 'complete', message: 'ok' }] };

    expect(fogUIResponseSchema.safeParse(missingThinking).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(missingContent).success).toBe(false);
  });

  it('rejects a component block with empty componentType', () => {
    const payload = {
      thinking: [],
      content: [
        { type: 'component', componentType: '', props: {} },
      ],
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts component blocks with null or missing props', () => {
    const payload = {
      thinking: [],
      content: [
        { type: 'component', componentType: 'card', props: null },
        { type: 'component', componentType: 'list' },
      ],
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts metadata as null or a record', () => {
    const withNull = {
      thinking: [],
      content: [],
      metadata: null,
    };
    const withRecord = {
      thinking: [],
      content: [],
      metadata: { version: '1.0', timestamp: '2026-01-01' },
    };

    expect(fogUIResponseSchema.safeParse(withNull).success).toBe(true);
    expect(fogUIResponseSchema.safeParse(withRecord).success).toBe(true);
  });

  it('accepts metadata with canonical contract version', () => {
    const payload = {
      thinking: [],
      content: [],
      metadata: {
        contractVersion: 'fogui/1.0',
        modelUsed: 'test-model',
      },
    };

    expect(fogUIResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts successful transform envelopes with canonical payloads', () => {
    const payload = {
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'done' }],
      },
      usage: {
        transformTokens: 12,
        model: 'test-model',
      },
    };

    expect(fogUITransformResultSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts transform usage objects with nullable fields and extra metadata', () => {
    const payload = {
      success: true,
      result: {
        thinking: [],
        content: [],
      },
      usage: {
        transformTokens: null,
        model: null,
        estimatedCost: null,
        processingTimeMs: null,
        provider: 'test-provider',
      },
    };

    expect(fogUITransformResultSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts backend transform envelopes with null error fields', () => {
    const payload = {
      success: true,
      result: {
        thinking: [],
        content: [
          {
            type: 'component',
            value: null,
            componentType: 'Card',
            props: {
              title: 'Launch Readiness Summary',
              description: 'All systems are prepared for launch.',
            },
            children: null,
          },
          {
            type: 'text',
            value: 'Operator Note: Ensure all safety protocols are followed.',
            componentType: null,
            props: null,
            children: null,
          },
        ],
        metadata: {
          contractVersion: 'fogui/1.0',
        },
      },
      error: null,
      errorCode: null,
      errorDetails: null,
      usage: {
        model: 'gpt-4.1-nano',
        transformTokens: 31,
        estimatedCost: 0.0000186,
        processingTimeMs: 2263,
      },
      sessionId: null,
      requestId: 'fogui-aebb939d-4fe8-41ff-8839-12da43e29080',
    };

    expect(fogUITransformResultSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts failed transform envelopes with either an error or a fallback result', () => {
    const withError = {
      success: false,
      error: 'Transform failed',
    };
    const withResult = {
      success: false,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'partial fallback' }],
      },
    };

    expect(fogUITransformResultSchema.safeParse(withError).success).toBe(true);
    expect(fogUITransformResultSchema.safeParse(withResult).success).toBe(true);
  });

  it('rejects successful transform envelopes without results', () => {
    const payload = {
      success: true,
    };

    expect(fogUITransformResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects failed transform envelopes without an error or result', () => {
    const payload = {
      success: false,
      error: null,
    };

    expect(fogUITransformResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects text blocks with non-string values', () => {
    const payload = {
      thinking: [],
      content: [{ type: 'text', value: 42 }],
    };

    expect(fogUIResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects nested component trees with invalid child blocks', () => {
    const payload = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Container',
          children: [
            {
              type: 'text',
              value: 99,
            },
          ],
        },
      ],
    };

    expect(fogUIResponseSchema.safeParse(payload).success).toBe(false);
  });
});

describe('stream schemas', () => {
  it('accepts stream usage with extra fields', () => {
    const payload = {
      transformTokens: 11,
      processingTimeMs: 320,
      model: 'stream-model',
    };

    expect(fogUIStreamUsageSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects invalid stream usage field types', () => {
    const payload = {
      transformTokens: '11',
    };

    expect(fogUIStreamUsageSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts stream errors with additional metadata', () => {
    const payload = {
      error: 'Stream interrupted',
      code: 'STREAM_ABORT',
    };

    expect(fogUIStreamErrorSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects stream errors without a message', () => {
    expect(fogUIStreamErrorSchema.safeParse({ code: 'STREAM_ABORT' }).success).toBe(false);
  });
});
