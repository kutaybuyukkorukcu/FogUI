import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { headlessAdapter } from '../adapters/headless';
import { createAdapter, getAdapterConformance } from '../utils';

describe('adapters', () => {
  it('renders headless card, form, input, button and badge components', () => {
    const Card = headlessAdapter.components.Card;
    const Form = headlessAdapter.components.Form;
    const Input = headlessAdapter.components.Input;
    const Button = headlessAdapter.components.Button;
    const Badge = headlessAdapter.components.Badge;

    render(
      <Card title="Title" description="Description">
        <Form aria-label="demo-form">
          <Input label="Name" placeholder="name" />
          <Button>Save</Button>
          <Badge data-testid="badge" label="New" />
        </Form>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveTextContent('New');
  });

  it('renders headless table and list variants', () => {
    const Table = headlessAdapter.components.Table;
    const List = headlessAdapter.components.List;

    const { container } = render(
      <>
        <Table headers={['A', 'B']} rows={[[1, 2], [3, 4]]} />
        <List items={['one', 'two']} ordered />
        <List items={['x', 'y']} ordered={false} />
      </>
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(container.querySelectorAll('ol').length).toBe(1);
    expect(container.querySelectorAll('ul').length).toBe(1);
  });

  it('stringifies complex table and list values', () => {
    const Table = headlessAdapter.components.Table;
    const List = headlessAdapter.components.List;

    render(
      <>
        <Table
          headers={['Payload', 'Enabled']}
          rows={[[{ status: 'ok' }, false]]}
        />
        <List items={[{ id: 7, label: 'queued' }, true]} ordered={false} />
      </>
    );

    expect(screen.getByText('{"status":"ok"}')).toBeInTheDocument();
    expect(screen.getAllByText('false')).toHaveLength(1);
    expect(screen.getByText('{"id":7,"label":"queued"}')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('renders headless layout components with inline layout styles', () => {
    const Container = headlessAdapter.components.Container;
    const Stack = headlessAdapter.components.Stack;
    const Grid = headlessAdapter.components.Grid;
    const Tabs = headlessAdapter.components.Tabs;

    render(
      <>
        <Container layout="grid" columns={3} gap="lg" data-testid="container-grid">cell</Container>
        <Container layout="stack" gap="sm" data-testid="container-stack">stacked</Container>
        <Stack direction="horizontal" gap={2} data-testid="stack">item</Stack>
        <Grid columns={3} gap={6} data-testid="grid">cell</Grid>
        <Tabs data-testid="tabs">tab-content</Tabs>
      </>
    );

    expect(screen.getByTestId('container-grid')).toHaveStyle({
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '16px',
    });
    expect(screen.getByTestId('container-stack')).toHaveStyle({
      flexDirection: 'column',
      gap: '8px',
    });
    expect(screen.getByTestId('stack')).toHaveStyle({ flexDirection: 'row', gap: '2px' });
    expect(screen.getByTestId('grid')).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' });
    expect(screen.getByTestId('tabs')).toHaveTextContent('tab-content');
  });

  it('normalizes layout props and falls back for invalid values', () => {
    const Container = headlessAdapter.components.Container;
    const Grid = headlessAdapter.components.Grid;
    const Stack = headlessAdapter.components.Stack;

    render(
      <>
        <Container layout="GRID" columns="4" gap="12" data-testid="container-grid-string">cell</Container>
        <Container layout="masonry" gap="unknown" data-testid="container-fallback">fallback</Container>
        <Grid columns="0" gap="bad" data-testid="grid-fallback">cell</Grid>
        <Stack direction="vertical" gap="md" data-testid="stack-md">item</Stack>
      </>
    );

    expect(screen.getByTestId('container-grid-string')).toHaveStyle({
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '12px',
    });
    expect(screen.getByTestId('container-fallback')).toHaveStyle({
      flexDirection: 'column',
      gap: '8px',
    });
    expect(screen.getByTestId('grid-fallback')).toHaveStyle({
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '8px',
    });
    expect(screen.getByTestId('stack-md')).toHaveStyle({ gap: '12px' });
  });

  it('dispatches button actions on click', () => {
    const Button = headlessAdapter.components.Button;
    const onAction = vi.fn();

    render(<Button onAction={onAction}>Run</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect(onAction).toHaveBeenCalledWith('click');
  });

  it('reports adapter conformance issues for missing required components', () => {
    const adapter = createAdapter({
      components: {
        Card: ({ children }: { children?: ReactNode }) => <section>{children}</section>,
      },
      conformance: {
        requiredComponents: ['Card', 'Button'],
      },
    });

    const result = getAdapterConformance(adapter);

    expect(result.ok).toBe(false);
    expect(result.requiredComponents).toEqual(['Card', 'Button']);
    expect(result.issues).toEqual([
      {
        kind: 'missing-component',
        componentType: 'Button',
        message: 'Adapter is missing a required component mapping for "Button".',
      },
    ]);
  });

  it('accepts adapters that satisfy their required mappings', () => {
    const adapter = createAdapter({
      components: {
        Button: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
        Card: ({ children }: { children?: ReactNode }) => <section>{children}</section>,
      },
      conformance: {
        requiredComponents: ['Card', 'Button'],
      },
    });

    expect(getAdapterConformance(adapter)).toEqual({
      ok: true,
      issues: [],
      requiredComponents: ['Card', 'Button'],
    });
  });
});
