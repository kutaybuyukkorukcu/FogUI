import { describe, it, expect } from 'vitest';
import type { 
  FogUIResponse, 
  ContentBlock, 
  ComponentBlock, 
  ThinkingItem 
} from '../types';

/**
 * Foundational tests for FogUI type definitions.
 * These tests validate the core type structures that form the contract
 * between the backend and frontend.
 */
describe('FogUI Types', () => {
  describe('ContentBlock', () => {
    it('should support text type', () => {
      const textBlock: ContentBlock = {
        type: 'text',
        value: 'Hello World',
      };

      expect(textBlock.type).toBe('text');
      expect(textBlock.value).toBe('Hello World');
    });

    it('should support component type', () => {
      const componentBlock: ContentBlock = {
        type: 'component',
        componentType: 'card',
        props: { title: 'Test Card' },
      };

      expect(componentBlock.type).toBe('component');
      expect(componentBlock.componentType).toBe('card');
      expect(componentBlock.props).toEqual({ title: 'Test Card' });
    });
  });

  describe('ComponentBlock (with children support)', () => {
    it('should support children for nested components', () => {
      const containerBlock: ComponentBlock = {
        type: 'component',
        componentType: 'container',
        props: { layout: 'grid', columns: 2 },
        children: [
          { type: 'component', componentType: 'card', props: { title: 'Card A' } },
          { type: 'component', componentType: 'card', props: { title: 'Card B' } },
        ],
      };

      expect(containerBlock.componentType).toBe('container');
      expect(containerBlock.children).toHaveLength(2);
      const firstChild = containerBlock.children?.[0];
      expect(firstChild?.type).toBe('component');
      if (firstChild?.type === 'component') {
        expect(firstChild.componentType).toBe('card');
      }
    });

    it('should support deeply nested containers', () => {
      const deeplyNested: ComponentBlock = {
        type: 'component',
        componentType: 'container',
        props: { layout: 'stack' },
        children: [
          {
            type: 'component',
            componentType: 'container',
            props: { layout: 'grid' },
            children: [
              { type: 'component', componentType: 'card', props: { title: 'Deep' } },
            ],
          },
        ],
      };

      const innerContainer = deeplyNested.children?.[0] as ComponentBlock;
      expect(innerContainer.componentType).toBe('container');
      const nestedChild = innerContainer.children?.[0];
      expect(nestedChild?.type).toBe('component');
      if (nestedChild?.type === 'component') {
        expect(nestedChild.componentType).toBe('card');
      }
    });
  });

  describe('ThinkingItem', () => {
    it('should support message and status', () => {
      const thinkingItem: ThinkingItem = {
        message: 'Analyzing content...',
        status: 'complete',
      };

      expect(thinkingItem.message).toBe('Analyzing content...');
      expect(thinkingItem.status).toBe('complete');
    });
  });

  describe('FogUIResponse', () => {
    it('should contain thinking and content arrays', () => {
      const response: FogUIResponse = {
        thinking: [
          { message: 'Processing...', status: 'complete' },
        ],
        content: [
          { type: 'text', value: 'Hello' },
          { type: 'component', componentType: 'card', props: {} },
        ],
      };

      expect(response.thinking).toHaveLength(1);
      expect(response.content).toHaveLength(2);
    });

    it('should support 5 base component types', () => {
      const response: FogUIResponse = {
        thinking: [],
        content: [
          { type: 'text', value: 'Text block' },
          { type: 'component', componentType: 'card', props: { title: 'Card' } },
          { type: 'component', componentType: 'list', props: { items: [] } },
          { type: 'component', componentType: 'table', props: { columns: [], rows: [] } },
          { 
            type: 'component', 
            componentType: 'container', 
            props: { layout: 'grid' },
            children: [],
          },
        ],
      };

      expect(response.content).toHaveLength(5);
      
      // Verify component types
      const componentTypes = response.content
        .filter(b => b.type === 'component')
        .map(b => b.componentType);
      
      expect(componentTypes).toContain('card');
      expect(componentTypes).toContain('list');
      expect(componentTypes).toContain('table');
      expect(componentTypes).toContain('container');
    });
  });
});
