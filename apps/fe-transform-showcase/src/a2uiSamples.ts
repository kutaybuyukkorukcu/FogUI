export interface A2UiSample {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly expected: string;
  readonly focusComponents: readonly string[];
  readonly payload: Record<string, unknown>;
}

export const a2UiSamples: readonly A2UiSample[] = [
  {
    id: 'supported-text-card',
    title: 'Supported Text + Card',
    summary: 'Valid text and component blocks translated into canonical output with no diagnostics.',
    expected: 'Canonical text block plus Card component',
    focusComponents: ['Text', 'Card'],
    payload: {
      thinking: [
        {
          status: 'complete',
          message: 'Mapping an A2UI payload into the canonical FogUI contract.',
        },
      ],
      content: [
        {
          type: 'text',
          value: 'Quarterly business review prepared for operator handoff.',
        },
        {
          type: 'component',
          componentType: 'Card',
          props: {
            title: 'Revenue Summary',
            description: 'Stable compatibility translation through the backend controller.',
          },
          children: [
            {
              type: 'text',
              value: 'Revenue increased 18% QoQ and churn remained below target.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'named-tabs',
    title: 'Named Component Tree',
    summary: 'Uses name-based component mapping plus nested children to exercise more than one component family.',
    expected: 'Tabs with two panes and nested Card content',
    focusComponents: ['Tabs', 'TabPane', 'Card'],
    payload: {
      content: [
        {
          name: 'Tabs',
          children: [
            {
              name: 'TabPane',
              props: {
                title: 'Americas',
              },
              children: [
                {
                  componentType: 'Card',
                  props: {
                    title: 'Americas',
                    description: 'Launch readiness is green across support, revenue, and compliance.',
                  },
                },
              ],
            },
            {
              name: 'TabPane',
              props: {
                title: 'EMEA',
              },
              children: [
                {
                  componentType: 'Card',
                  props: {
                    title: 'EMEA',
                    description: 'Compliance sign-off is pending one regional document refresh.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'fallback-unsupported',
    title: 'Unsupported Node Fallback',
    summary: 'Exercises deterministic fallback emission and translation diagnostics for unsupported nodes.',
    expected: 'A2UiUnsupportedNode fallback block with translation errors',
    focusComponents: ['A2UiUnsupportedNode'],
    payload: {
      content: [
        {
          foo: 'bar',
        },
      ],
    },
  },
  {
    id: 'invalid-content-container',
    title: 'Invalid Content Container',
    summary: 'Shows how compatibility diagnostics and downstream canonical validation interact for malformed payload sections.',
    expected: 'Compatibility errors plus canonical validation errors',
    focusComponents: ['Diagnostics'],
    payload: {
      thinking: {
        message: 'This should be an array, not an object.',
      },
      content: {
        type: 'text',
        value: 'This should also be an array, not an object.',
      },
    },
  },
];

export const defaultA2UiSampleId = a2UiSamples[0]?.id ?? '';