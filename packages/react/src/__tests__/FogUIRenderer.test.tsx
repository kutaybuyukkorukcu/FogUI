import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FogUIProvider } from '../providers/FogUIProvider';
import { FogUIRenderer } from '../components/FogUIRenderer';
import type { FogUIResponse } from '../types';
import type { Adapter } from '../types/adapter';

// Mock Components
const MockCard = ({ title, description, children }: any) => (
  <div data-testid="card">
    {title && <h1 data-testid="card-title">{title}</h1>}
    {description && <p data-testid="card-description">{description}</p>}
    <div>{children}</div>
  </div>
);

// Mock Adapter
const mockAdapter: Adapter = {
  components: {
    Card: MockCard,
  },
};

describe('FogUIRenderer', () => {
  it('should render a simple text block', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [{ type: 'text', value: 'Hello, World!' }],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('renders multiline text with line breaks', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [{ type: 'text', value: 'Line 1\nLine 2' }],
    };

    const { container } = render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} className="renderer" style={{ padding: 8 }} />
      </FogUIProvider>
    );

    expect(screen.getByText((content) => content.includes('Line 1'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Line 2'))).toBeInTheDocument();
    expect(container.querySelector('br')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('renderer');
  });

  it('should render a component block using the adapter', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Card',
          props: { title: 'Test Title' },
          children: [],
        },
      ],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('should render nested components', () => {
    const response: FogUIResponse = {
        thinking: [],
        content: [
          {
            type: 'component',
            componentType: 'Card',
            props: { title: 'Parent' },
            children: [
              {
                type: 'component',
                componentType: 'Card',
                props: { title: 'Child' },
                children: []
              }
            ]
          },
        ],
      };
  
      render(
        <FogUIProvider adapter={mockAdapter} apiKey="test">
          <FogUIRenderer response={response} />
        </FogUIProvider>
      );
  
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2);
  });

  it('applies adapter.mapProps before rendering components', () => {
    const mapProps = vi.fn((_type: string, props: Record<string, unknown>) => ({
      ...props,
      title: `Mapped ${String(props.title)}`,
    }));

    const mappedAdapter: Adapter = {
      components: {
        Card: MockCard,
      },
      mapProps,
    };

    const response: FogUIResponse = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Card',
          props: { title: 'Original' },
          children: [],
        },
      ],
    };

    render(
      <FogUIProvider adapter={mappedAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(mapProps).toHaveBeenCalledWith('Card', { title: 'Original' });
    expect(screen.getByTestId('card-title')).toHaveTextContent('Mapped Original');
  });

  it('should fire the onAction callback when a component triggers it', () => {
    const onActionMock = vi.fn();

    const ActionButton = ({ onAction, label }: { onAction: (action: string, data?: any) => void; label: string }) => (
      <button onClick={() => onAction('button-clicked', { from: 'test' })}>{label}</button>
    );

    const adapterWithAction: Adapter = {
      components: {
        Button: ActionButton,
      },
    };

    const response: FogUIResponse = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Button',
          props: { label: 'Click Me' },
          children: [],
        },
      ],
    };

    render(
      <FogUIProvider adapter={adapterWithAction} apiKey="test">
        <FogUIRenderer response={response} onAction={onActionMock} />
      </FogUIProvider>
    );
    
    screen.getByText('Click Me').click();
    expect(onActionMock).toHaveBeenCalledWith('button-clicked', { from: 'test' });
  });

  it('should render a warning for an unmapped component', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const response: FogUIResponse = {
      thinking: [],
      content: [{ type: 'component', componentType: 'UnmappedComponent', props: {}, children: [] }],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText(/Unmapped component: "UnmappedComponent"/)).toBeInTheDocument();
    expect(screen.getByText(/Available adapter components: Card/)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[FogUI] Unmapped component: "UnmappedComponent". Available adapter components: Card. Add a "UnmappedComponent" mapping in adapter.components.'
    );

    consoleSpy.mockRestore();
  });

  it('should suggest closest component match when component name casing differs', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response: FogUIResponse = {
      thinking: [],
      content: [{ type: 'component', componentType: 'card', props: {}, children: [] }],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText(/Did you mean "Card"/)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[FogUI] Unmapped component: "card". Did you mean "Card"? Available adapter components: Card. Add a "card" mapping in adapter.components.'
    );

    consoleSpy.mockRestore();
  });

  it('should not render anything for a null or empty response', () => {
    const { container } = render(
        <FogUIProvider adapter={mockAdapter} apiKey="test">
            {/* @ts-expect-error testing invalid/null response shape */}
            <FogUIRenderer response={null} />
        </FogUIProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null for unsupported block types', () => {
    const response = {
      thinking: [],
      content: [
        {
          type: 'unknown',
          value: 'noop',
        },
      ],
    } as unknown as FogUIResponse;

    const { container } = render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.textContent).toBe('');
  });
});
