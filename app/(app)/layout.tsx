'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/realtime/NotificationBell'
import type { User } from '@supabase/supabase-js'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  )},
  { href: '/documents/new', label: 'New document', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ), accent: true },
  { href: '/settings', label: 'Settings', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      // First-time users go to onboarding (skip if already on onboarding)
      if (!data.user.user_metadata?.onboarded && !pathname.startsWith('/onboarding')) {
        router.push('/onboarding')
      }
    })
  }, [router, pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const name = user?.user_metadata?.full_name ?? user?.email ?? 'User'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FAFAF8' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220,
        minWidth: collapsed ? 60 : 220,
        background: 'white',
        borderRight: '1px solid #E5E0D8',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '16px 0' : '16px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E5E0D8', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: '#DC6B19', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: 16, color: '#1C1917', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Folio</span>
            </Link>
          )}
          {collapsed && (
            <div style={{ width: 26, height: 26, background: '#DC6B19', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4, borderRadius: 6, display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)} style={{ cursor: 'pointer', color: '#9C9389', padding: 4, display: 'flex', position: 'absolute', left: 64, zIndex: 10, background: 'white', border: '1px solid #E5E0D8', borderRadius: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '8px 0' : '7px 10px',
                  borderRadius: 9,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  textDecoration: 'none',
                  background: active ? (item.accent ? '#FFF3E8' : '#F5F3EF') : 'transparent',
                  color: active ? (item.accent ? '#DC6B19' : '#1C1917') : '#6B6559',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  transition: 'background 0.1s, color 0.1s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F5F3EF' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ flexShrink: 0, color: active && item.accent ? '#DC6B19' : 'currentColor' }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #E5E0D8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '6px 0' : '6px 8px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF3E8', color: '#DC6B19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name.split(' ')[0]}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4, borderRadius: 5, display: 'flex', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top right header with bell */}
        {user && (
          <div style={{ position: 'fixed', top: 12, right: 20, zIndex: 30 }}>
            <NotificationBell userId={user.id} />
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
