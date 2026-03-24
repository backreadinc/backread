'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
  }

  if (done) {
    return (
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#1C1917', margin: '0 0 8px' }}>Check your email</h2>
        <p style={{ fontSize: 15, color: '#6B6559', lineHeight: 1.6 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: '#1C1917', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Start for free</h1>
        <p style={{ fontSize: 15, color: '#6B6559', margin: 0 }}>No credit card required</p>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 16, padding: '32px' }}>
        <button
          onClick={handleGoogle}
          style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid #E5E0D8', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#1C1917', marginBottom: 20, fontFamily: 'inherit' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#E5E0D8' }}/>
          <span style={{ fontSize: 12, color: '#9C9389' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E5E0D8' }}/>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full name" type="text" placeholder="Ada Okafor" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Work email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          {error && <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>}
          <Button variant="primary" type="submit" loading={loading} size="lg" style={{ width: '100%' }}>Create account</Button>
          <p style={{ fontSize: 12, color: '#9C9389', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: '#6B6559', marginTop: 20 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#DC6B19', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  )
}
