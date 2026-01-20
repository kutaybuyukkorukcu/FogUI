import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FogUIProvider, useFogUIContext } from '../FogUIProvider';

/**
 * Foundational tests for FogUIProvider.
 * These tests validate the core provider functionality that enables
 * the FogUI SDK to work with customer applications.
 */
describe('FogUIProvider', () => {
  describe('Basic Provider Functionality', () => {
    it('should render children correctly', () => {
      render(
        <FogUIProvider apiKey="test_key">
          <div data-testid="child">Hello</div>
        </FogUIProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should warn when API key is missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <FogUIProvider apiKey="">
          <div>Test</div>
        </FogUIProvider>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key is required')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Values', () => {
    // Helper component to test context values
    const ContextConsumer = () => {
      const context = useFogUIContext();
      return (
        <div>
          <span data-testid="apiKey">{context.apiKey}</span>
          <span data-testid="endpoint">{context.endpoint}</span>
          <span data-testid="hasRegistry">{context.componentRegistry ? 'yes' : 'no'}</span>
        </div>
      );
    };

    it('should provide apiKey through context', () => {
      render(
        <FogUIProvider apiKey="fog_test_123">
          <ContextConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('apiKey')).toHaveTextContent('fog_test_123');
    });

    it('should use default endpoint when not specified', () => {
      render(
        <FogUIProvider apiKey="test">
          <ContextConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('endpoint')).toHaveTextContent('https://api.virtuoapps.com');
    });

    it('should use custom endpoint when specified', () => {
      render(
        <FogUIProvider apiKey="test" endpoint="https://custom.api.com">
          <ContextConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('endpoint')).toHaveTextContent('https://custom.api.com');
    });

    it('should provide component registry when specified', () => {
      const customComponents = {
        card: () => <div>Custom Card</div>,
      };

      render(
        <FogUIProvider apiKey="test" components={customComponents}>
          <ContextConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('hasRegistry')).toHaveTextContent('yes');
    });
  });

  describe('Component Registry (Design System Compatibility)', () => {
    const RegistryConsumer = () => {
      const { componentRegistry } = useFogUIContext();
      if (!componentRegistry) return <div>No registry</div>;
      
      const CardComponent = componentRegistry['card'];
      return CardComponent ? <CardComponent title="Test" /> : <div>No card</div>;
    };

    it('should allow custom component overrides', () => {
      const CustomCard = ({ title }: { title: string }) => (
        <div data-testid="custom-card">{title}</div>
      );

      render(
        <FogUIProvider apiKey="test" components={{ card: CustomCard }}>
          <RegistryConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('custom-card')).toHaveTextContent('Test');
    });

    it('should support multiple component overrides', () => {
      const CustomCard = () => <div data-testid="card">Card</div>;
      const CustomList = () => <div data-testid="list">List</div>;
      const CustomTable = () => <div data-testid="table">Table</div>;

      const MultiConsumer = () => {
        const { componentRegistry } = useFogUIContext();
        if (!componentRegistry) return null;
        
        const Card = componentRegistry['card'];
        const List = componentRegistry['list'];
        const Table = componentRegistry['table'];
        
        return (
          <>
            {Card && <Card />}
            {List && <List />}
            {Table && <Table />}
          </>
        );
      };

      render(
        <FogUIProvider 
          apiKey="test" 
          components={{ 
            card: CustomCard, 
            list: CustomList, 
            table: CustomTable 
          }}
        >
          <MultiConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('list')).toBeInTheDocument();
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });

    it('should support container component override', () => {
      const CustomContainer = ({ children, layout }: { children?: React.ReactNode; layout?: string }) => (
        <div data-testid="container" data-layout={layout}>
          {children}
        </div>
      );

      const ContainerConsumer = () => {
        const { componentRegistry } = useFogUIContext();
        if (!componentRegistry) return null;
        
        const Container = componentRegistry['container'];
        return Container ? <Container layout="grid">Content</Container> : null;
      };

      render(
        <FogUIProvider apiKey="test" components={{ container: CustomContainer }}>
          <ContainerConsumer />
        </FogUIProvider>
      );

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('data-layout', 'grid');
      expect(container).toHaveTextContent('Content');
    });

    it('should support container with nested card children', () => {
      const CustomCard = ({ title }: { title: string }) => (
        <div data-testid="nested-card">{title}</div>
      );

      const CustomContainer = ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="container-with-children">{children}</div>
      );

      const NestedConsumer = () => {
        const { componentRegistry } = useFogUIContext();
        if (!componentRegistry) return null;
        
        const Container = componentRegistry['container'];
        const Card = componentRegistry['card'];
        
        return Container ? (
          <Container>
            {Card && <Card title="Child 1" />}
            {Card && <Card title="Child 2" />}
          </Container>
        ) : null;
      };

      render(
        <FogUIProvider 
          apiKey="test" 
          components={{ 
            container: CustomContainer, 
            card: CustomCard 
          }}
        >
          <NestedConsumer />
        </FogUIProvider>
      );

      expect(screen.getByTestId('container-with-children')).toBeInTheDocument();
      const cards = screen.getAllByTestId('nested-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveTextContent('Child 1');
      expect(cards[1]).toHaveTextContent('Child 2');
    });
  });

  describe('useFogUIContext Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const TestComponent = () => {
        useFogUIContext();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useFogUI must be used within a FogUIProvider'
      );
      
      consoleSpy.mockRestore();
    });
  });
});
