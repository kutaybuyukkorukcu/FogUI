export const FOGUI_RECOMMENDED_COMPONENT_TYPES = [
  'Badge',
  'Button',
  'Card',
  'Container',
  'Form',
  'Grid',
  'Input',
  'List',
  'Stack',
  'Table',
  'Tabs',
] as const;

export type FogUIRecommendedComponentType = typeof FOGUI_RECOMMENDED_COMPONENT_TYPES[number];

export interface TextBlock {
  readonly type: 'text';
  readonly value: string;
}

export interface ComponentBlock {
  readonly type: 'component';
  readonly componentType: string;
  readonly props?: Readonly<Record<string, unknown>> | null;
  readonly children?: readonly ContentBlock[] | null;
}

export type ContentBlock = TextBlock | ComponentBlock;

export interface ThinkingItem {
  readonly status: string;
  readonly message: string;
  readonly timestamp?: string | null;
}

export interface FogUIResponseMetadata {
  readonly contractVersion?: string;
  readonly modelUsed?: string;
  readonly queryType?: string;
  readonly timestamp?: string;
  readonly version?: string;
  readonly [key: string]: unknown;
}

export interface FogUIResponse {
  readonly thinking: readonly ThinkingItem[];
  readonly content: readonly ContentBlock[];
  readonly metadata?: FogUIResponseMetadata | null;
}
