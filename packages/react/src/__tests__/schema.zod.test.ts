import { describe, expect, it } from 'vitest';
import { fogUIResponseSchema } from '../types/schema.zod';

describe('fogUIResponseSchema', () => {
  it('accepts nested canonical component payloads', () => {
    const payload = {
      thinking: [{ status: 'complete', message: 'done' }],
      content: [
        { type: 'text', value: 'hello' },
        {
          type: 'component',
          componentType: 'Card',
          props: { title: 'Card title' },
          children: [
            {
              type: 'component',
              componentType: 'Stack',
              props: { direction: 'horizontal', gap: 2 },
              children: [
                {
                  type: 'component',
                  componentType: 'Badge',
                  props: { label: 'status', color: 'green' },
                },
              ],
            },
          ],
        },
      ],
      metadata: { modelUsed: 'test-model' },
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts tabs with tab panes and form children', () => {
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
                    {
                      type: 'component',
                      componentType: 'Button',
                      props: { label: 'Save', action: 'submit_profile' },
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

  it('normalizes malformed top-level response shapes', () => {
    // Missing required top-level fields
    const missingThinking = {
      content: [{ type: 'text', value: 'hi' }],
    };
    const missingContent = {
      thinking: [{ status: 'complete', message: 'ok' }],
    };
    // Wrong types
    const wrongThinkingType = {
      thinking: 'not-an-array',
      content: [{ type: 'text', value: 'hi' }],
    };
    const wrongContentType = {
      thinking: [{ status: 'complete', message: 'ok' }],
      content: 'not-an-array',
    };

    const parsedMissingThinking = fogUIResponseSchema.safeParse(missingThinking);
    const parsedMissingContent = fogUIResponseSchema.safeParse(missingContent);
    const parsedWrongThinking = fogUIResponseSchema.safeParse(wrongThinkingType);
    const parsedWrongContent = fogUIResponseSchema.safeParse(wrongContentType);

    expect(parsedMissingThinking.success).toBe(true);
    expect(parsedMissingContent.success).toBe(true);
    expect(parsedWrongThinking.success).toBe(true);
    expect(parsedWrongContent.success).toBe(true);

    if (!parsedMissingThinking.success || !parsedMissingContent.success || !parsedWrongThinking.success || !parsedWrongContent.success) {
      return;
    }

    expect(parsedMissingThinking.data.thinking).toEqual([]);
    expect(parsedMissingContent.data.content).toEqual([]);
    expect(parsedWrongThinking.data.thinking).toEqual([]);
    expect(parsedWrongContent.data.content).toEqual([]);
  });

  it('normalizes mixed block payloads into deterministic render-safe shapes', () => {
    const payload = {
      thinking: [{ status: '', message: 42 }],
      content: [
        { type: 'text', value: 1234 },
        {
          type: 'component',
          componentType: '  list  ',
          props: {
            title: 'KPIs',
            children: [
              { type: 'text', value: 'Child from props.children' },
            ],
          },
        },
        {
          componentType: 'card',
          props: 'invalid-props-type',
        },
      ],
    };

    const result = fogUIResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data.thinking[0]).toEqual({ status: 'complete', message: '42', timestamp: undefined });
    expect(result.data.content[0]).toEqual({ type: 'text', value: '1234' });

    expect(result.data.content[1]).toMatchObject({
      type: 'component',
      componentType: 'list',
      props: { title: 'KPIs' },
    });

    const listComponent = result.data.content[1] as { children?: unknown[] };
    expect(Array.isArray(listComponent.children)).toBe(true);

    expect(result.data.content[2]).toMatchObject({
      type: 'component',
      componentType: 'card',
      props: {},
    });
  });
});
