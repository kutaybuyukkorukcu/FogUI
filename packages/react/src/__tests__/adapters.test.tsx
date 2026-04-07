import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
