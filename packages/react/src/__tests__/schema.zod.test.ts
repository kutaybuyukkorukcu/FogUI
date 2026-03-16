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

  it('rejects truly invalid response shapes', () => {
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
    expect(fogUIResponseSchema.safeParse(missingThinking).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(missingContent).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(wrongThinkingType).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(wrongContentType).success).toBe(false);
  });
});
