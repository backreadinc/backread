'use client'
import { useState, useRef } from 'react'
import Button from '@/components/ui/Button'

interface AIDrafterProps {
  documentType: string
  onDraftComplete: (html: string) => void
  onClose: () => void
}

const TONES = ['Professional', 'Conversational', 'Bold & direct', 'Warm & personal']

const TYPE_LABELS: Record<string, string> = {
  pitch_deck: 'pitch deck',
  proposal: 'proposal',
  document: 'document',
}

export default function AIDrafter({ documentType, onDraftComplete, onClose }: AIDrafterProps) {
  const [brief, setBrief] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [tone, setTone] = useState('Professional')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [done, setDone] = useState(false)
  const accumulatedRef = useRef('')

  async function generate() {
    if (!brief.trim()) return
    setStreaming(true)
    setStreamText('')
    accumulatedRef.current = ''

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: documentType, brief, companyName, targetAudience, tone: tone.toLowerCase() }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value, { stream: true })
        accumulatedRef.current += chunk
        setStreamText(accumulatedRef.current)
      }
      setDone(true)
    } catch (err) {
      console.error(err)
    } finally {
      setStreaming(false)
    }
  }

  function applyDraft() {
    onDraftComplete(accumulatedRef.current)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget && !streaming) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #DC6B19, #F59E0B)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L10.5 6.5H15L11.25 9.25L12.75 13.75L9 11L5.25 13.75L6.75 9.25L3 6.5H7.5L9 2Z" fill="white"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1C1917' }}>AI document drafter</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>Generate a full {TYPE_LABELS[documentType] ?? 'document'} from a brief</p>
          </div>
          {!streaming && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {!streaming && !done ? (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#1C1917', display: 'block', marginBottom: 6 }}>
                    Company or project name
                  </label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Inc, Project Phoenix…"
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#1C1917', display: 'block', marginBottom: 6 }}>
                    Who is the audience?
                  </label>
                  <input
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="e.g. Series A VCs, enterprise procurement teams…"
                    style={inputSt}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#1C1917', display: 'block', marginBottom: 6 }}>
                    Brief <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value)}
                    placeholder={documentType === 'pitch_deck'
                      ? 'e.g. B2B SaaS platform that helps hospitals reduce patient no-shows by 40% using SMS reminders. We have 12 hospital clients, $180k ARR, raising $2M seed…'
                      : documentType === 'proposal'
                      ? 'e.g. Digital marketing proposal for a Lagos-based fintech startup. 3-month campaign, social media + SEO, budget around ₦5M…'
                      : 'e.g. Quarterly business review for our investors covering Q3 metrics, growth drivers, challenges, and Q4 plan…'}
                    rows={5}
                    style={{ ...inputSt, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }}
                  />
                  <p style={{ fontSize: 12, color: '#9C9389', margin: '6px 0 0' }}>The more detail you give, the better the output. Include numbers, context, and goals.</p>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#1C1917', display: 'block', marginBottom: 8 }}>Tone</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {TONES.map(t => (
                      <button key={t} onClick={() => setTone(t)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: tone === t ? '1px solid #DC6B19' : '1px solid #E5E0D8', background: tone === t ? '#FFF3E8' : 'white', color: tone === t ? '#DC6B19' : '#6B6559', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: tone === t ? 500 : 400 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 24px' }}>
              {streaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#FFF3E8', border: '1px solid #FED7AA', borderRadius: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC6B19', animation: 'pulse-dot 1s ease-in-out infinite' }}/>
                  <span style={{ fontSize: 13, color: '#DC6B19', fontWeight: 500 }}>Writing your {TYPE_LABELS[documentType]}…</span>
                </div>
              )}
              {done && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Draft complete — review below and apply to your document</span>
                </div>
              )}
              <div style={{ border: '1px solid #E5E0D8', borderRadius: 12, padding: '24px 28px', background: '#FAFAF8', maxHeight: 400, overflow: 'auto', fontSize: 14, lineHeight: 1.7, color: '#1C1917' }}
                dangerouslySetInnerHTML={{ __html: streamText || '<p style="color:#9C9389">Generating…</p>' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E0D8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {!streaming && !done && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={generate} disabled={!brief.trim()}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.5 5.5H13L9.25 8.25L10.75 12.75L7 10L3.25 12.75L4.75 8.25L1 5.5H5.5L7 1Z" fill="currentColor"/>
                </svg>
                Generate draft
              </Button>
            </>
          )}
          {done && (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setDone(false); setStreamText('') }}>Start over</Button>
              <Button variant="primary" size="sm" onClick={applyDraft}>Apply to document →</Button>
            </>
          )}
          {streaming && (
            <span style={{ fontSize: 13, color: '#9C9389', alignSelf: 'center' }}>Generating, please wait…</span>
          )}
        </div>
      </div>
    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', height: 40, border: '1px solid #E5E0D8', borderRadius: 9,
  padding: '0 12px', fontSize: 14, color: '#1C1917', fontFamily: 'inherit',
  outline: 'none', background: 'white', boxSizing: 'border-box',
}
