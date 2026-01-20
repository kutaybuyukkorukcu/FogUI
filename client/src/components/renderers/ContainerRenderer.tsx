import { DynamicComponent } from './ComponentRegistry';
import type { ComponentBlock } from '../../types';

interface ContainerProps {
  layout?: 'stack' | 'grid';
  direction?: 'vertical' | 'horizontal'; // For stack
  gap?: 'sm' | 'md' | 'lg' | 'none';
  columns?: number; // For grid
  children?: ComponentBlock[];
  className?: string;
  // Support passing children via props (Vercel style) or children array
  items?: ComponentBlock[]; 
}

const GAPS = {
  none: '',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

/**
 * ContainerRenderer - recursive layout component.
 * Supports Stack (Flex) and Grid layouts similar to Vercel's pattern.
 */
export const ContainerRenderer = (props: ContainerProps) => {
  const { 
    layout = 'stack', 
    direction = 'vertical', 
    gap = 'md', 
    columns = 1,
    className = '',
    children, 
    items 
  } = props;

  // Normalize children source
  const nodesToRender = children || items || [];

  if (!nodesToRender.length) return null;

  const baseClasses = GAPS[gap];
  let layoutClasses = '';

  if (layout === 'stack') {
    layoutClasses = `flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'}`;
  } else if (layout === 'grid') {
    layoutClasses = `grid grid-cols-1 md:grid-cols-${columns}`;
  }

  return (
    <div className={`${layoutClasses} ${baseClasses} ${className} w-full`}>
      {nodesToRender.map((block, index) => (
        <DynamicComponent 
          key={index} 
          block={block} 
        />
      ))}
    </div>
  );
};
