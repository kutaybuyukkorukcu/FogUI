// packages/react/src/types/canonical.ts

import React from 'react';

export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: () => void;
  children?: React.ReactNode;
}

export interface CardProps {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export interface TableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}

export interface InputProps {
  placeholder?: string;
  type?: string;
}

export interface LabelProps {
  children?: React.ReactNode;
  htmlFor?: string;
}

export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
}

export interface StackProps {
  children?: React.ReactNode;
  spacing?: number;
}

export interface GridProps {
  children?: React.ReactNode;
  cols?: number;
  gap?: number;
}
