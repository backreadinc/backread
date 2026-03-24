'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface UploadModalProps {
  onClose: () => void
}

const ACCEPTED = ['.pdf', '.pptx', '.docx']
const ACCEPTED_TYPES = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export default function UploadModal({ onClose }: UploadModalProps) {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Please upload a PDF, PPTX, or DOCX file.')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum 20MB.')
      return
    }
    setError('')
    setFile(f)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  async function upload() {
    if (!file) return
    setUploading(true)
    setProgress(10)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const form = new FormData()
    form.append('file', file)
    form.append('userId', user.id)

    setProgress(40)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    setProgress(80)

    if (!res.ok) {
      const { error } = await res.json()
      setError(error ?? 'Upload failed')
      setUploading(false)
      return
    }

    const { documentId } = await res.json()
    setProgress(100)
    setTimeout(() => router.push(`/documents/${documentId}`), 300)
  }

  const fileExt = file?.name.split('.').pop()?.toUpperCase()
  const fileSize = file ? (file.size / 1024 < 1000 ? `${Math.round(file.size / 1024)}KB` : `${(file.size / 1024 / 1024).toFixed(1)}MB`) : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget && !uploading) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1C1917' }}>Upload a file</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>PDF, PPTX, or DOCX · max 20MB</p>
          </div>
          {!uploading && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>}
        </div>

        <div style={{ padding: '24px' }}>
          {!file ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#DC6B19' : '#D0C9BE'}`,
                borderRadius: 14,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? '#FFF3E8' : '#FAFAF8',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1917', margin: '0 0 6px' }}>Drop your file here</p>
              <p style={{ fontSize: 14, color: '#9C9389', margin: '0 0 16px' }}>or click to browse</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {ACCEPTED.map(ext => (
                  <span key={ext} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', background: '#F5F3EF', border: '1px solid #E5E0D8', borderRadius: 6, color: '#6B6559' }}>{ext.toUpperCase()}</span>
                ))}
              </div>
              <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            </div>
          ) : uploading ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⬆️</div>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1917', margin: '0 0 16px' }}>Uploading {file.name}…</p>
              <div style={{ height: 6, background: '#E5E0D8', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', background: '#DC6B19', width: `${progress}%`, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: 13, color: '#9C9389', margin: 0 }}>{progress}%</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F5F3EF', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, background: '#DC6B19', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{fileExt}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9C9389' }}>{fileSize}</p>
                </div>
                <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4, flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              {error && <p style={{ fontSize: 13, color: '#DC2626', margin: '0 0 14px' }}>{error}</p>}
            </div>
          )}
        </div>

        {!uploading && (
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={upload} disabled={!file || !!error}>
              Upload & open
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
