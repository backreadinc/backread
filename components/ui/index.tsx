import { cn, getInitials } from '@/lib/utils'

// Card
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Badge
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'
export function Badge({ variant = 'default', className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
    success: 'bg-[var(--success-subtle)] text-[var(--success)]',
    warning: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
    info: 'bg-[var(--info-subtle)] text-[var(--info)]',
    brand: 'bg-[var(--brand-subtle)] text-[var(--brand)]',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// Avatar
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' }
  const colors = ['bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', sizes[size], colors[colorIdx], className)}>
      {getInitials(name)}
    </div>
  )
}

// Stat card
export function StatCard({ label, value, sub, trend }: { label: string; value: string | number; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-4">
      <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  )
}

// Divider
export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-[var(--border)]', className)} />
}

// Empty state
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="text-4xl mb-4 opacity-40">{icon}</div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// Toggle / Switch
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
          checked ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'
        )}
      >
        <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm', checked ? 'translate-x-4.5' : 'translate-x-0.5')} style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </button>
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </label>
  )
}
