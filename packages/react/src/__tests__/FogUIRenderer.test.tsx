import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

  it('renders nested blocks when backend provides props.children', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Card',
          props: {
            title: 'Parent Via Props',
            children: [
              {
                type: 'component',
                componentType: 'Card',
                props: { title: 'Child Via Props' },
              },
            ],
          },
          children: [],
        },
      ],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText('Parent Via Props')).toBeInTheDocument();
    expect(screen.getByText('Child Via Props')).toBeInTheDocument();
  });

  it('prefers block children over props.children when both are present', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [
        {
          type: 'component',
          componentType: 'Card',
          props: {
            title: 'Parent Both Sources',
            children: [
              {
                type: 'component',
                componentType: 'Card',
                props: { title: 'Child From Props' },
              },
            ],
          },
          children: [
            {
              type: 'component',
              componentType: 'Card',
              props: { title: 'Child From Block' },
            },
          ],
        },
      ],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText('Parent Both Sources')).toBeInTheDocument();
    expect(screen.getByText('Child From Block')).toBeInTheDocument();
    expect(screen.queryByText('Child From Props')).not.toBeInTheDocument();
  });

  it('applies adapter.mapProps before rendering components', () => {
    const mapProps = vi.fn(({ componentType, props }: { componentType: string; props: Record<string, unknown> }) => ({
      ...props,
      title: `Mapped ${componentType} ${String(props.title)}`,
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

    expect(mapProps).toHaveBeenCalledWith({ componentType: 'Card', props: { title: 'Original' } });
    expect(screen.getByTestId('card-title')).toHaveTextContent('Mapped Card Original');
  });

  it('renders fallback output when adapter.mapProps throws', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const failingAdapter: Adapter = {
      components: {
        Card: MockCard,
      },
      mapProps: () => {
        throw new Error('mapProps failed');
      },
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
      <FogUIProvider adapter={failingAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByText(/Adapter prop mapping failed/)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[FogUI] Adapter mapProps failed for "Card". Did you mean "Card"? Available adapter components: Card.'
    );

    consoleSpy.mockRestore();
  });

  it('should fire the onAction callback when a component triggers it', async () => {
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
    await waitFor(() => {
      expect(onActionMock).toHaveBeenCalledWith('button-clicked', { from: 'test' });
    });
  });

  it('fires lifecycle hooks in deterministic order for successful actions', async () => {
    const order: string[] = [];

    const ActionButton = ({ onAction, label }: { onAction: (action: string, data?: unknown) => void; label: string }) => (
      <button onClick={() => onAction('button-clicked', { from: 'lifecycle' })}>{label}</button>
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
          props: { label: 'Lifecycle Action' },
          children: [],
        },
      ],
    };

    const onAction = vi.fn(() => {
      order.push('action');
    });

    render(
      <FogUIProvider
        adapter={adapterWithAction}
        apiKey="test"
        onActionStart={(payload) => {
          order.push('start');
          expect(payload.action).toBe('button-clicked');
          expect(payload.sourceComponent).toBe('Button');
          expect(typeof payload.timestamp).toBe('string');
        }}
        onAction={onAction}
        onActionComplete={(payload) => {
          order.push('complete');
          expect(payload.action).toBe('button-clicked');
        }}
      >
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    screen.getByText('Lifecycle Action').click();

    await waitFor(() => {
      expect(order).toEqual(['start', 'action', 'complete']);
    });
    expect(onAction).toHaveBeenCalledWith('button-clicked', { from: 'lifecycle' });
  });

  it('fires onActionError when action handler throws', async () => {
    const onActionError = vi.fn();

    const ActionButton = ({ onAction, label }: { onAction: (action: string, data?: unknown) => void; label: string }) => (
      <button onClick={() => onAction('explode', { from: 'test' })}>{label}</button>
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
          props: { label: 'Explode' },
          children: [],
        },
      ],
    };

    render(
      <FogUIProvider
        adapter={adapterWithAction}
        apiKey="test"
        onAction={() => {
          throw new Error('Boom');
        }}
        onActionError={onActionError}
      >
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    screen.getByText('Explode').click();

    await waitFor(() => {
      expect(onActionError).toHaveBeenCalledTimes(1);
    });

    const payload = onActionError.mock.calls[0][0] as { action: string; sourceComponent: string; error: Error };
    expect(payload.action).toBe('explode');
    expect(payload.sourceComponent).toBe('Button');
    expect(payload.error.message).toBe('Boom');
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
      '[FogUI] Unmapped component "UnmappedComponent" received from canonical response. Available adapter components: Card.'
    );

    consoleSpy.mockRestore();
  });

  it('resolves components when component name casing differs', () => {
    const response: FogUIResponse = {
      thinking: [],
      content: [{ type: 'component', componentType: 'card', props: {}, children: [] }],
    };

    render(
      <FogUIProvider adapter={mockAdapter} apiKey="test">
        <FogUIRenderer response={response} />
      </FogUIProvider>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
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
