import type { ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  children: ReactNode;
  variant?: 'gold' | 'blue' | 'success' | 'error' | 'muted';
}

export function Badge({ children, variant = 'gold' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}
