import { ComponentBlock } from '../types';

export interface CardComponent extends ComponentBlock {
  componentType: 'Card';
  props: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  children?: ComponentBlock[];
}

export interface TableComponent extends ComponentBlock {
  componentType: 'Table';
  props: {
    headers: string[];
    rows: (string | number | boolean)[][];
    [key: string]: unknown;
  };
}

export interface ListComponent extends ComponentBlock {
  componentType: 'List';
  props: {
    items: string[];
    ordered?: boolean;
    [key: string]: unknown;
  };
}

export interface FormComponent extends ComponentBlock {
  componentType: 'Form';
  props: {
    [key: string]: unknown;
  };
  children?: (InputComponent | ButtonComponent)[];
}

export interface InputComponent extends ComponentBlock {
  componentType: 'Input';
  props: {
    label?: string;
    placeholder?: string;
    type?: 'text' | 'number' | 'password';
    [key: string]: unknown;
  };
}

export interface ButtonComponent extends ComponentBlock {
  componentType: 'Button';
  props: {
    label: string;
    action: string;
    [key: string]: unknown;
  };
}

export interface StackComponent extends ComponentBlock {
  componentType: 'Stack';
  props: {
    direction?: 'horizontal' | 'vertical';
    gap?: number;
    [key:string]: unknown;
  };
  children?: ComponentBlock[];
}

export interface GridComponent extends ComponentBlock {
    componentType: 'Grid';
    props: {
        columns?: number;
        gap?: number;
        [key:string]: unknown;
    }
    children?: ComponentBlock[];
}

export interface TabsComponent extends ComponentBlock {
    componentType: 'Tabs';
    props: {
        [key:string]: unknown;
    },
    children?: TabPaneComponent[];
}

export interface TabPaneComponent extends ComponentBlock {
    componentType: 'TabPane';
    props: {
        title: string;
        [key:string]: unknown;
    }
    children?: ComponentBlock[];
}

export interface BadgeComponent extends ComponentBlock {
    componentType: 'Badge';
    props: {
        label: string;
        color?: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
        [key:string]: unknown;
    }
}

export type FogUIComponent = 
    | CardComponent
    | TableComponent
    | ListComponent
    | FormComponent
    | InputComponent
    | ButtonComponent
    | StackComponent
    | GridComponent
    | TabsComponent
    | BadgeComponent;
