'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { supabase } from '@/lib/supabase/client'
import { buildShareUrl, generateToken, formatRelativeTime } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Badge, Toggle } from '@/components/ui'
import AIDrafter from '@/components/editor/AIDrafter'
import type { Database } from '@/lib/supabase/client'

type Document = Database['public']['Tables']['documents']['Row']
type ShareLink = Database['public']['Tables']['share_links']['Row']

const EMOJIS = ['📄','🚀','💼','📊','📋','🎯','💡','🔍','📈','🤝','🏢','⚡','🌟','🔒','📝']

export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [doc, setDoc] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('📄')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDrafter, setShowDrafter] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({ immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing… or press "/" for commands' }),
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => autoSave(editor.getHTML()), 1500)
    },
  })

  useEffect(() => {
    loadDocument()
    loadShareLinks()
  }, [params.id])

  async function loadDocument() {
    const { data } = await supabase.from('documents').select('*').eq('id', params.id).single()
    if (!data) { router.push('/dashboard'); return }
    setDoc(data)
    setTitle(data.title)
    setEmoji(data.cover_emoji ?? '📄')
    if (editor && data.content) editor.commands.setContent(data.content)
  }

  useEffect(() => {
    if (editor && doc?.content) editor.commands.setContent(doc.content)
  }, [editor, doc])

  async function loadShareLinks() {
    const { data } = await supabase.from('share_links').select('*').eq('document_id', params.id).order('created_at', { ascending: false })
    setShareLinks(data ?? [])
  }

  async function autoSave(content: string) {
    setSaving(true)
    await supabase.from('documents').update({ content, updated_at: new Date().toISOString() }).eq('id', params.id)
    setSaving(false)
    setLastSaved(new Date())
  }

  async function saveTitle() {
    await supabase.from('documents').update({ title: title || 'Untitled', cover_emoji: emoji }).eq('id', params.id)
  }

  async function publishDocument() {
    await supabase.from('documents').update({ status: 'active' }).eq('id', params.id)
    setDoc(prev => prev ? { ...prev, status: 'active' } : prev)
    setShowShare(true)
  }

  const isActive = doc?.status === 'active'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #E5E0D8', background: 'white', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontFamily: 'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Docs
        </button>
        <span style={{ color: '#E5E0D8' }}>/</span>
        <span style={{ fontSize: 13, color: '#6B6559', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Untitled'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#9C9389' }}>
            {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Live' : 'Draft'}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowDrafter(true)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L7.8 5H12L8.6 7.4L9.9 11.5L6.5 9.1L3.1 11.5L4.4 7.4L1 5H5.2L6.5 1Z" fill="currentColor"/></svg>
            AI draft
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${params.id}/present`)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 11h3M6.5 10v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Present
          </Button>
          {isActive ? (
            <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 7.5v2a1 1 0 01-1 1h-6a1 1 0 01-1-1V5M8.5 2H10.5V4M6.5 5.5l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Share
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={publishDocument}>Publish & Share</Button>
          )}
        </div>
      </div>

      {/* Editor toolbar */}
      <EditorToolbar editor={editor} />

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '48px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Cover */}
          <div style={{ marginBottom: 8, position: 'relative' }}>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ fontSize: 48, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 8, lineHeight: 1 }}>{emoji}</button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #E5E0D8', borderRadius: 12, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6, width: 260, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false); setTimeout(saveTitle, 100) }}
                    style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 6, lineHeight: 1 }}>{e}</button>
                ))}
              </div>
            )}
          </div>
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            placeholder="Untitled"
            style={{ width: '100%', border: 'none', outline: 'none', fontFamily: "'DM Serif Display', serif", fontSize: 40, color: '#1C1917', background: 'transparent', marginBottom: 24, letterSpacing: '-0.02em', lineHeight: 1.2, padding: 0 }}
          />
          {/* Editor */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Share modal */}
      {showShare && <ShareModal documentId={params.id} links={shareLinks} onClose={() => setShowShare(false)} onRefresh={loadShareLinks} />}
      {/* AI Drafter modal */}
      {showDrafter && (
        <AIDrafter
          documentType={doc?.type ?? 'document'}
          onDraftComplete={(html) => {
            editor?.commands.setContent(html)
            autoSave(html)
          }}
          onClose={() => setShowDrafter(false)}
        />
      )}
    </div>
  )
}

// ---- Toolbar ----
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  const btn = (active: boolean, onClick: () => void, children: React.ReactNode, title: string) => (
    <button
      title={title}
      onClick={onClick}
      style={{ padding: '4px 7px', borderRadius: 6, border: 'none', background: active ? '#F5F3EF' : 'transparent', color: active ? '#1C1917' : '#6B6559', cursor: 'pointer', display: 'flex', alignItems: 'center', lineHeight: 1 }}
    >{children}</button>
  )
  return (
    <div style={{ borderBottom: '1px solid #E5E0D8', padding: '6px 20px', background: 'white', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, flexWrap: 'wrap' }}>
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <b style={{ fontSize: 14 }}>B</b>, 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <i style={{ fontSize: 14 }}>I</i>, 'Italic')}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <s style={{ fontSize: 13 }}>S</s>, 'Strikethrough')}
      {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), <code style={{ fontSize: 12 }}>{'<>'}</code>, 'Code')}
      <div style={{ width: 1, height: 18, background: '#E5E0D8', margin: '0 4px' }}/>
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <span style={{ fontSize: 12, fontWeight: 700 }}>H1</span>, 'Heading 1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <span style={{ fontSize: 12, fontWeight: 700 }}>H2</span>, 'Heading 2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <span style={{ fontSize: 12, fontWeight: 700 }}>H3</span>, 'Heading 3')}
      <div style={{ width: 1, height: 18, background: '#E5E0D8', margin: '0 4px' }}/>
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="4" r="1" fill="currentColor"/><circle cx="2" cy="7" r="1" fill="currentColor"/><circle cx="2" cy="10" r="1" fill="currentColor"/><path d="M5 4h7M5 7h7M5 10h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, 'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2.5h2M1 7h2M1 11.5h2M5 4h7M5 7h7M5 10h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, 'Ordered list')}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h4v4H4a2 2 0 01-2-2V4zM8 4h4v4h-2a2 2 0 01-2-2V4z" fill="currentColor" opacity=".3"/><path d="M2 10h4M8 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, 'Quote')}
      <div style={{ width: 1, height: 18, background: '#E5E0D8', margin: '0 4px' }}/>
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>, 'Horizontal rule')}
      {btn(false, () => editor.chain().focus().undo().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5h6a3 3 0 010 6H5M2 5l3-3M2 5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'Undo')}
      {btn(false, () => editor.chain().focus().redo().run(),
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 5H6a3 3 0 000 6h3M12 5l-3-3M12 5l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'Redo')}
    </div>
  )
}

// ---- Share modal ----
function ShareModal({ documentId, links, onClose, onRefresh }: { documentId: string; links: ShareLink[]; onClose: () => void; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [requireEmail, setRequireEmail] = useState(false)
  const [allowDownload, setAllowDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(links.length === 0)

  async function createLink() {
    setCreating(true)
    const token = generateToken(14)
    await supabase.from('share_links').insert({
      document_id: documentId,
      token,
      label: label || 'Share link',
      require_email: requireEmail,
      allow_download: allowDownload,
      password: password || null,
      is_active: true,
    })
    await onRefresh()
    setCreating(false)
    setShowNew(false)
    setLabel('')
    setPassword('')
    setRequireEmail(false)
    setAllowDownload(false)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(buildShareUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function toggleLink(id: string, active: boolean) {
    await supabase.from('share_links').update({ is_active: active }).eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 420, height: '100vh', background: 'white', borderLeft: '1px solid #E5E0D8', display: 'flex', flexDirection: 'column', animation: 'slideRight 0.25s ease-out' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 600, color: '#1C1917' }}>Share document</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#9C9389' }}>{links.length} link{links.length !== 1 ? 's' : ''} created</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9389', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Existing links */}
          {links.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#9C9389', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Active links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(link => (
                  <div key={link.id} style={{ border: '1px solid #E5E0D8', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{link.label ?? 'Share link'}</span>
                      <Badge variant={link.is_active ? 'success' : 'default'}>{link.is_active ? 'Active' : 'Disabled'}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, color: '#6B6559', background: '#F5F3EF', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {buildShareUrl(link.token)}
                      </code>
                      <button onClick={() => copyLink(link.token)}
                        style={{ padding: '4px 10px', background: copied === link.token ? '#F0FDF4' : '#F5F3EF', border: '1px solid', borderColor: copied === link.token ? '#BBF7D0' : '#E5E0D8', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: copied === link.token ? '#16A34A' : '#6B6559', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {copied === link.token ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#9C9389' }}>
                      <span>👁 {link.view_count} views</span>
                      {link.require_email && <span>📧 Email required</span>}
                      {link.password && <span>🔒 Password protected</span>}
                      {link.allow_download && <span>⬇ Downloads allowed</span>}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => toggleLink(link.id, !link.is_active)}
                        style={{ fontSize: 12, color: link.is_active ? '#DC2626' : '#16A34A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {link.is_active ? 'Disable link' : 'Enable link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create new link */}
          {!showNew ? (
            <button onClick={() => setShowNew(true)}
              style={{ width: '100%', padding: '10px', background: 'none', border: '1.5px dashed #D0C9BE', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: '#9C9389', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Create new link
            </button>
          ) : (
            <div style={{ border: '1px solid #E5E0D8', borderRadius: 12, padding: '16px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#1C1917' }}>New share link</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input label="Link label" placeholder="e.g. Sequoia meeting, Website embed…" value={label} onChange={e => setLabel(e.target.value)} />
                <Input label="Password (optional)" type="password" placeholder="Leave empty for no password" value={password} onChange={e => setPassword(e.target.value)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Toggle checked={requireEmail} onChange={setRequireEmail} label="Require email to view" />
                  <Toggle checked={allowDownload} onChange={setAllowDownload} label="Allow download" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" loading={creating} onClick={createLink} size="sm">Create link</Button>
                  <Button variant="ghost" onClick={() => setShowNew(false)} size="sm">Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
