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

  it('rejects invalid variants and invalid response shape', () => {
    const invalidButton = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Button',
          props: { label: 'Missing action' },
        },
      ],
    };

    const invalidThinking = {
      thinking: [{ status: 'pending', message: 'bad status' }],
      content: [{ type: 'text', value: 'hi' }],
    };

    const invalidBadge = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Badge',
          props: { label: 'oops', color: 'purple' },
        },
      ],
    };

    expect(fogUIResponseSchema.safeParse(invalidButton).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(invalidThinking).success).toBe(false);
    expect(fogUIResponseSchema.safeParse(invalidBadge).success).toBe(false);
  });
});
