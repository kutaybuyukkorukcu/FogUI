import React from 'react';
import { FogUIComponent } from './schema';

/**
 * Defines the shape of a component adapter for a specific design system.
 * The adapter is responsible for mapping canonical FogUI components to the
 * actual components in the target design system.
 */
export interface Adapter {
  /**
   * A map where keys are canonical component types (e.g., 'Card', 'Table')
   * and values are the corresponding React components from the design system.
   */
  components: {
    [K in FogUIComponent['componentType']]?: React.ComponentType<any>;
  };

  /**
   * An optional function to transform props from the canonical FogUI schema
   * to the props expected by the target component library.
   *
   * @param componentType The canonical type of the component (e.g., 'Card').
   * @param props The props from the FogUI response.
   * @returns The transformed props to be passed to the target component.
   */
  mapProps?: (
    componentType: FogUIComponent['componentType'],
    props: any
  ) => any;
}
