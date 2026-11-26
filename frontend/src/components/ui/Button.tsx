'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { duration, ease } from '@/motion/tokens';

export type ButtonVariant = 'primary' | 'default' | 'subtle' | 'danger' | 'link';
export type ButtonSize = 'compact' | 'default' | 'large';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-ink-inverse hover:bg-brand-hover active:bg-brand-pressed disabled:opacity-50',
  default:
    'bg-[rgba(9,30,66,0.04)] text-ink hover:bg-[rgba(9,30,66,0.08)] active:bg-[rgba(9,30,66,0.14)] [data-theme=dark]:bg-white/10 disabled:opacity-50',
  subtle:
    'bg-transparent text-ink-subtle hover:bg-surface-hover hover:text-ink active:bg-surface-pressed disabled:opacity-50',
  danger:
    'bg-[#C9372C] text-white hover:bg-[#AE2E24] active:bg-[#872821] disabled:opacity-50',
  link: 'bg-transparent text-ink-link hover:underline px-1 disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  compact: 'h-6 px-2 text-[12px]',
  default: 'h-8 px-3 text-[14px]',
  large: 'h-10 px-4 text-[14px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      loading = false,
      iconOnly = false,
      leftIcon,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{ duration: duration.instant, ease: ease.out }}
        className={`inline-flex items-center justify-center gap-1.5 rounded-sm font-medium select-none transition-colors duration-[80ms] ${
          iconOnly ? 'h-8 w-8 p-0' : SIZE_CLASSES[size]
        } ${VARIANT_CLASSES[variant]} ${
          loading ? 'pointer-events-none' : ''
        } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span className="truncate">{children}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
