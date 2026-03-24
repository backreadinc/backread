import { cn } from '@/lib/utils'
import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-0 focus:border-[var(--brand)]',
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input
