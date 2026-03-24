import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E0D8', background: 'rgba(250,250,248,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#DC6B19', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 17, color: '#1C1917', letterSpacing: '-0.02em' }}>Folio</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ padding: '6px 16px', fontSize: 14, color: '#6B6559', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
            <Link href="/signup" style={{ padding: '7px 18px', background: '#DC6B19', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF3E8', border: '1px solid #FED7AA', borderRadius: 99, padding: '4px 12px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, background: '#DC6B19', borderRadius: '50%', display: 'inline-block' }}/>
          <span style={{ fontSize: 13, color: '#DC6B19', fontWeight: 500 }}>Now in beta — free for early users</span>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 1.1, color: '#1C1917', margin: '0 0 20px', letterSpacing: '-0.02em', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          Send documents.<br />
          <span style={{ color: '#DC6B19', fontStyle: 'italic' }}>See everything.</span>
        </h1>
        <p style={{ fontSize: 18, color: '#6B6559', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 36px', fontWeight: 400 }}>
          Create pitch decks, proposals, and reports. Share with a link. Know exactly who read what, for how long — and what to do next.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{ padding: '12px 28px', background: '#DC6B19', color: 'white', borderRadius: 12, fontSize: 16, fontWeight: 500, textDecoration: 'none', boxShadow: '0 2px 8px rgba(220,107,25,0.3)' }}>
            Create your first document →
          </Link>
          <Link href="#how-it-works" style={{ padding: '12px 24px', background: 'white', color: '#1C1917', border: '1px solid #E5E0D8', borderRadius: 12, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
            See how it works
          </Link>
        </div>
        <p style={{ fontSize: 13, color: '#9C9389', marginTop: 16 }}>No credit card required · Free for up to 5 documents</p>
      </section>

      {/* Feature strip */}
      <section style={{ background: '#F5F3EF', borderTop: '1px solid #E5E0D8', borderBottom: '1px solid #E5E0D8', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {['Slide-by-slide heatmaps', 'Forwarding chain tracking', 'AI-powered nudges', 'E-signature ready', 'Access gates & expiry', 'Real-time alerts'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6559', fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#DC6B19"/><path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {f}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#DC6B19', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: '#1C1917', margin: 0, letterSpacing: '-0.02em' }}>Three steps to full visibility</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { step: '01', icon: '✏️', title: 'Create or upload', body: 'Write directly in Folio\'s editor, or upload your existing PDF, PPTX, or DOCX. Brand it, structure it, make it yours.' },
            { step: '02', icon: '🔗', title: 'Share with a link', body: 'Generate a smart link with access controls — password, email gate, expiry, download restrictions. One link, full control.' },
            { step: '03', icon: '👁️', title: 'Watch it happen', body: 'See who opened it, how long they spent on each page, whether they forwarded it, and exactly what to do next.' },
          ].map(item => (
            <div key={item.step} style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 16, padding: '28px 28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9C9389', letterSpacing: '0.06em' }}>{item.step}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1917', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#6B6559', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section style={{ background: '#F5F3EF', borderTop: '1px solid #E5E0D8', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: '#1C1917', margin: 0, letterSpacing: '-0.02em' }}>Built for every important send</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { emoji: '🚀', label: 'Pitch decks', desc: 'Know which slide killed the deal' },
              { emoji: '💼', label: 'Sales proposals', desc: 'Call when they\'re re-reading pricing' },
              { emoji: '📊', label: 'Investor updates', desc: 'Catch disengaged LPs early' },
              { emoji: '🤝', label: 'Partnership decks', desc: 'Track escalation to decision maker' },
              { emoji: '📋', label: 'Statements of work', desc: 'Know if scope is blocking sign-off' },
              { emoji: '🏢', label: 'Case studies', desc: 'Measure internal spread' },
            ].map(uc => (
              <div key={uc.label} style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 14, padding: '20px 20px 18px' }}>
                <span style={{ fontSize: 24, display: 'block', marginBottom: 10 }}>{uc.emoji}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', margin: '0 0 4px' }}>{uc.label}</p>
                <p style={{ fontSize: 13, color: '#9C9389', margin: 0 }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: '#1C1917', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Stop sending blind.</h2>
        <p style={{ fontSize: 18, color: '#6B6559', margin: '0 0 36px', lineHeight: 1.6 }}>Join thousands of founders, sales teams, and professionals who know exactly what happens after they hit send.</p>
        <Link href="/signup" style={{ padding: '14px 36px', background: '#DC6B19', color: 'white', borderRadius: 14, fontSize: 17, fontWeight: 600, textDecoration: 'none', display: 'inline-block', boxShadow: '0 4px 16px rgba(220,107,25,0.35)' }}>
          Start for free — no card needed
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E5E0D8', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, background: '#DC6B19', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1C1917' }}>Folio</span>
          </div>
          <p style={{ fontSize: 13, color: '#9C9389', margin: 0 }}>Send documents. See everything. Know what to do next.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Help'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: '#9C9389', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
