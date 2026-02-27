import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}

export function Card({ children, className = '', glass = false }: CardProps) {
  return (
    <div className={`card ${glass ? 'card-glass' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}
