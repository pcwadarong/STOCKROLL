import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

import * as css from './Button.css';

type ButtonProps = {
  /** `primary` red, `secondary` outline, `green`, `inverse` for colored surfaces, or text-only `plain`. */
  variant?: keyof typeof css.variant;
  size?: keyof typeof css.size;
  /** Renders a link to this in-app path instead of a button. */
  to?: string;
  /** Shows a busy label and blocks clicks while an action runs. */
  loading?: boolean;
  /** Marks a toggle as on or off. Leave unset for a plain action button. */
  pressed?: boolean;
  className?: string;
  children: ReactNode;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'disabled' | 'aria-label' | 'aria-expanded' | 'aria-controls'
>;

/**
 * Label-style button: flat, thin rule, uppercase typewriter lettering.
 * Used instead of SEED's ActionButton, whose rounded look does not match the brand.
 * @param props variant, size and either `to` (link) or `onClick` (button)
 */
export const Button = ({
  variant = 'secondary',
  size = 'medium',
  to,
  loading = false,
  pressed,
  className,
  children,
  ...rest
}: ButtonProps) => {
  const classes = [
    css.variant[variant],
    variant === 'plain' ? css.plainSize : css.size[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to !== undefined)
    return (
      <Link to={to} className={classes} aria-label={rest['aria-label']}>
        {children}
      </Link>
    );

  return (
    <button
      type="button"
      className={classes}
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
    >
      {loading ? 'Working…' : children}
    </button>
  );
};
