import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { headlessAdapter } from '../adapters/headless';
import { shadcnAdapter } from '../adapters/shadcn';

describe('adapters', () => {
  it('renders shadcn card, form, input, button and badge components', () => {
    const Card = shadcnAdapter.components.Card!;
    const Form = shadcnAdapter.components.Form!;
    const Input = shadcnAdapter.components.Input!;
    const Button = shadcnAdapter.components.Button!;
    const Badge = shadcnAdapter.components.Badge!;

    render(
      <Card title="Title" description="Description">
        <Form aria-label="demo-form">
          <Input placeholder="name" />
          <Button type="button">Save</Button>
          <Badge data-testid="badge">New</Badge>
        </Form>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveTextContent('New');
  });

  it('renders shadcn table and list variants', () => {
    const Table = shadcnAdapter.components.Table!;
    const List = shadcnAdapter.components.List!;

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

  it('renders shadcn layout components with dynamic classes', () => {
    const Stack = shadcnAdapter.components.Stack!;
    const Grid = shadcnAdapter.components.Grid!;
    const Tabs = shadcnAdapter.components.Tabs!;

    const { container } = render(
      <>
        <Stack direction="horizontal" gap={2} data-testid="stack">item</Stack>
        <Grid columns={3} gap={6} data-testid="grid">cell</Grid>
        <Tabs data-testid="tabs">tab-content</Tabs>
      </>
    );

    expect(screen.getByTestId('stack')).toHaveClass('flex-row');
    expect(screen.getByTestId('stack')).toHaveClass('gap-2');
    expect(screen.getByTestId('grid')).toHaveClass('grid-cols-3');
    expect(screen.getByTestId('grid')).toHaveClass('gap-6');
    expect(screen.getByTestId('tabs')).toHaveTextContent('tab-content');
    expect(container.querySelectorAll('[data-testid]').length).toBe(3);
  });

  it('renders headless adapter primitives', () => {
    const Button = headlessAdapter.components.Button!;
    const Card = headlessAdapter.components.Card!;
    const Input = headlessAdapter.components.Input!;
    const Badge = headlessAdapter.components.Badge!;
    const Stack = headlessAdapter.components.Stack!;
    const Grid = headlessAdapter.components.Grid!;
    const Table = headlessAdapter.components.Table!;

    render(
      <>
        <Button>Click</Button>
        <Card data-testid="card">Body</Card>
        <Input placeholder="headless-input" />
        <Badge data-testid="badge">Badge</Badge>
        <Stack data-testid="stack">Stack</Stack>
        <Grid data-testid="grid">Grid</Grid>
        <Table headers={['H1']} rows={[[42]]} />
      </>
    );

    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveTextContent('Body');
    expect(screen.getByPlaceholderText('headless-input')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveTextContent('Badge');
    expect(screen.getByTestId('stack')).toHaveTextContent('Stack');
    expect(screen.getByTestId('grid')).toHaveTextContent('Grid');
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
