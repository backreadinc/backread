import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 32px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: '#DC6B19', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 17, color: '#1C1917', letterSpacing: '-0.02em' }}>Folio</span>
        </Link>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        {children}
      </div>
    </div>
  )
}
