'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const PERSONAS = [
  { id: 'founder',    emoji: '🚀', label: 'Founder',       desc: 'Pitch decks, investor updates' },
  { id: 'sales',      emoji: '💼', label: 'Sales',         desc: 'Proposals, quotes, case studies' },
  { id: 'freelancer', emoji: '✏️', label: 'Freelancer',    desc: 'Proposals, SOWs, deliverables' },
  { id: 'marketer',   emoji: '📣', label: 'Marketer',      desc: 'Media kits, campaign briefs' },
  { id: 'recruiter',  emoji: '🤝', label: 'Recruiter',     desc: 'Offer letters, company decks' },
  { id: 'consultant', emoji: '📊', label: 'Consultant',    desc: 'Strategy reports, audits' },
]

const FIRST_DOC = [
  { type: 'pitch_deck',  emoji: '🚀', label: 'Pitch deck',     desc: 'For fundraising' },
  { type: 'proposal',    emoji: '💼', label: 'Proposal',       desc: 'For winning clients' },
  { type: 'document',    emoji: '📄', label: 'Document',       desc: 'Reports, memos, briefs' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step,    setStep]    = useState(0)
  const [persona, setPersona] = useState('')
  const [docType, setDocType] = useState('')
  const [saving,  setSaving]  = useState(false)

  async function finish() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { persona, onboarded: true } })
    if (docType) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const emoji = FIRST_DOC.find(d => d.type === docType)?.emoji ?? '📄'
        const { data: doc } = await supabase.from('documents').insert({
          title: 'Untitled',
          type: docType as any,
          user_id: user.id,
          cover_emoji: emoji,
          status: 'draft',
        }).select().single()
        if (doc) { router.push(`/documents/${doc.id}`); return }
      }
    }
    router.push('/dashboard')
  }

  const steps = [
    {
      title: 'What best describes you?',
      sub: 'We\'ll personalise Folio for your use case',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {PERSONAS.map(p => (
            <button key={p.id} onClick={() => { setPersona(p.id); setStep(1) }}
              style={{ background: 'white', border: `1.5px solid ${persona===p.id?'#DC6B19':'#E5E0D8'}`, borderRadius: 14, padding: '18px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#DC6B19'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = persona===p.id?'#DC6B19':'#E5E0D8'}>
              <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>{p.emoji}</span>
              <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 600, color: '#1C1917' }}>{p.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9C9389' }}>{p.desc}</p>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'What do you want to create first?',
      sub: 'You can always create more later',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {FIRST_DOC.map(d => (
            <button key={d.type} onClick={() => { setDocType(d.type); setStep(2) }}
              style={{ background: 'white', border: `1.5px solid ${docType===d.type?'#DC6B19':'#E5E0D8'}`, borderRadius: 14, padding: '24px 18px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#DC6B19'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = docType===d.type?'#DC6B19':'#E5E0D8'}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>{d.emoji}</span>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#1C1917' }}>{d.label}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>{d.desc}</p>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'You\'re all set',
      sub: 'Here\'s what Folio can do for you',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { emoji: '✏️', title: 'Create documents', desc: 'Write in our editor, or upload a PDF/PPTX/DOCX' },
            { emoji: '🔗', title: 'Share with a smart link', desc: 'Password, email gate, expiry — you control everything' },
            { emoji: '👁',  title: 'See who read what', desc: 'Per-page heatmaps, time on page, forwarding chains' },
            { emoji: '💡', title: 'Get AI-powered nudges', desc: 'Know exactly when and how to follow up' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'white', border: '1px solid #E5E0D8', borderRadius: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: '#1C1917' }}>{item.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>{item.desc}</p>
              </div>
            </div>
          ))}
          <Button variant="primary" size="lg" onClick={finish} loading={saving} style={{ marginTop: 8 }}>
            {docType ? `Create my ${FIRST_DOC.find(d=>d.type===docType)?.label.toLowerCase()} →` : 'Open dashboard →'}
          </Button>
        </div>
      )
    }
  ]

  const current = steps[step]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <div style={{ width: 28, height: 28, background: '#DC6B19', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2h6l4 4v6H2V2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 2v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 17, color: '#1C1917', letterSpacing: '-0.02em' }}>Folio</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? '#DC6B19' : '#E5E0D8', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: '#1C1917', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{current.title}</h1>
          <p style={{ fontSize: 15, color: '#9C9389', margin: '0 0 28px' }}>{current.sub}</p>
          {current.content}
        </div>

        {/* Back */}
        {step > 0 && step < steps.length - 1 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ marginTop: 20, background: 'none', border: 'none', color: '#9C9389', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
        )}
      </div>
    </div>
  )
}
