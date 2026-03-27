'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface SigRecord {
  id: string
  document_id: string
  signer_name: string
  signer_email: string | null
  signer_company: string | null
  document_hash: string
  signed_at: string
  ip_address: string | null
  is_valid: boolean
  documents?: { title: string; type: string }
}

const F = "'Inter', system-ui, sans-serif"

export default function VerifyPage({ params }: { params: { id: string } }) {
  const [sig, setSig]       = useState<SigRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('document_signatures')
        .select('*, documents(title, type)')
        .eq('id', params.id)
        .single()
      if (!data) { setNotFound(true); setLoading(false); return }
      setSig(data as SigRecord)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return (
    <Shell>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:'#6B6B6B', fontFamily:F }}>
        <Spinner /> Verifying signature…
      </div>
    </Shell>
  )

  if (notFound || !sig) return (
    <Shell>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:16 }}>❌</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#111', marginBottom:8, fontFamily:F }}>Signature not found</h2>
        <p style={{ color:'#6B6B6B', fontSize:14, fontFamily:F }}>
          This verification link is invalid or the signature record doesn't exist.
        </p>
      </div>
    </Shell>
  )

  const date = new Date(sig.signed_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour:'2-digit', minute:'2-digit', timeZoneName:'short'
  })

  return (
    <Shell>
      {/* Status banner */}
      <div style={{
        width:'100%', maxWidth:580, background: sig.is_valid ? '#F0FDF4' : '#FEF2F2',
        border:`1px solid ${sig.is_valid ? '#BBF7D0' : '#FECACA'}`,
        borderRadius:14, padding:'18px 22px', marginBottom:24,
        display:'flex', alignItems:'flex-start', gap:14,
      }}>
        <div style={{ fontSize:28, lineHeight:1, flexShrink:0 }}>{sig.is_valid ? '✅' : '⚠️'}</div>
        <div>
          <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:800, color: sig.is_valid ? '#166534' : '#991B1B', fontFamily:F }}>
            {sig.is_valid ? 'Signature verified' : 'Document modified after signing'}
          </h2>
          <p style={{ margin:0, fontSize:13, color: sig.is_valid ? '#15803D' : '#B91C1C', lineHeight:1.6, fontFamily:F }}>
            {sig.is_valid
              ? 'This signature is authentic. The document has not been modified since it was signed.'
              : 'The document content has changed since this signature was recorded. This signature may no longer be valid for the current version.'
            }
          </p>
        </div>
      </div>

      {/* Signature record card */}
      <div style={{ width:'100%', maxWidth:580, background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.06)' }}>
        {/* Header */}
        <div style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', padding:'20px 24px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 14l3.5-1.5 8-8-2-2-8 8L4 14z" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M12.5 4.5l1.5 1.5" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </div>
          <div>
            <h3 style={{ margin:'0 0 2px', fontSize:15, fontWeight:700, color:'#111', fontFamily:F }}>Folio Digital Signature</h3>
            <p style={{ margin:0, fontSize:12, color:'#6B6B6B', fontFamily:F }}>Cryptographically verified record</p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:0 }}>
          {[
            { label:'Document', value:(sig.documents as any)?.title ?? 'Unknown document' },
            { label:'Signed by', value:sig.signer_name },
            { label:'Email', value:sig.signer_email ?? '—' },
            { label:'Company', value:sig.signer_company ?? '—' },
            { label:'Date', value:formattedDate },
            { label:'Time', value:formattedTime },
            { label:'IP address', value:sig.ip_address ?? '—', mono:true },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display:'flex', justifyContent:'space-between', alignItems:'flex-start',
              padding:'12px 0',
              borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none',
              gap:16,
            }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#6B6B6B', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:F, flexShrink:0 }}>{row.label}</span>
              <span style={{ fontSize:13, color:'#111', fontFamily: row.mono ? "'JetBrains Mono', monospace" : F, fontWeight:500, textAlign:'right', wordBreak:'break-all' }}>{row.value}</span>
            </div>
          ))}

          {/* Document hash */}
          <div style={{ paddingTop:12, borderTop:'1px solid #F1F5F9' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#6B6B6B', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:F, marginBottom:8 }}>Document hash (SHA-256)</div>
            <code style={{ fontSize:11, color:'#3D3D3D', fontFamily:"'JetBrains Mono', monospace", background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:7, padding:'8px 10px', display:'block', wordBreak:'break-all', lineHeight:1.6 }}>
              {sig.document_hash}
            </code>
            <p style={{ margin:'8px 0 0', fontSize:11, color:'#9CA3AF', lineHeight:1.6, fontFamily:F }}>
              This hash is a cryptographic fingerprint of the document at the exact moment it was signed.
              If you have the original document file, you can verify it matches this hash.
              Any modification to the document after signing will produce a different hash.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background:'#F8FAFC', borderTop:'1px solid #E2E8F0', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="5" fill="#4F46E5"/><path d="M5 10h3l2-5 2.5 10 2-5h2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:12, fontWeight:600, color:'#4F46E5', fontFamily:F }}>⬡ Verified by Folio</span>
          </div>
          <span style={{ fontSize:11, color:'#9CA3AF', fontFamily:F }}>ID: {params.id.slice(0,8)}…</span>
        </div>
      </div>

      <p style={{ marginTop:24, fontSize:12, color:'#9CA3AF', textAlign:'center', fontFamily:F }}>
        This verification page is publicly accessible. Anyone with this URL can confirm the authenticity of this signature.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:F }}>
      {/* Folio wordmark */}
      <div style={{ marginBottom:32, display:'flex', alignItems:'center', gap:10 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#4F46E5"/><path d="M7 14h4l2.5-6.5L17 21l2.5-7H23" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ fontSize:18, fontWeight:800, color:'#111', letterSpacing:'-.02em', fontFamily:F }}>Folio</span>
        <span style={{ fontSize:12, color:'#9CA3AF', fontFamily:F }}>Signature Verification</span>
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid #E2E8F0', borderTopColor:'#4F46E5' }}/>
  )
}