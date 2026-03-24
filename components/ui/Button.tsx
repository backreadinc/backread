'use client'
import { cn } from '@/lib/utils'
import { forwardRef, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] transition-all duration-150 cursor-pointer select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-sm active:scale-[0.98]',
      secondary: 'bg-white text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] shadow-sm active:scale-[0.98]',
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:scale-[0.98]',
      danger: 'bg-[var(--danger)] text-white hover:opacity-90 shadow-sm active:scale-[0.98]',
      outline: 'border-2 border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand-subtle)] active:scale-[0.98]',
    }
    const sizes = {
      sm: 'h-7 px-3 text-[13px]',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
    }
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
