import { describe, expect, it } from 'vitest';
import { fogUIResponseSchema } from '../types/schema.zod';

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
});
