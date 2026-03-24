'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card } from '@/components/ui'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setName(data.user?.user_metadata?.full_name ?? '')
      setEmail(data.user?.email ?? '')
    })
  }, [])

  async function save() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: name } })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#1C1917', margin: '0 0 28px', letterSpacing: '-0.02em' }}>Settings</h1>

      <div style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1917', margin: '0 0 20px' }}>Profile</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Full name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" value={email} disabled hint="Email cannot be changed" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="primary" onClick={save} loading={saving} size="sm">Save changes</Button>
            {saved && <span style={{ fontSize: 13, color: '#16A34A' }}>✓ Saved</span>}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E0D8', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1C1917', margin: '0 0 8px' }}>Integrations</h2>
        <p style={{ fontSize: 13, color: '#9C9389', margin: '0 0 20px', lineHeight: 1.5 }}>Connect Folio to your existing tools</p>
        {[
          { name: 'Slack', desc: 'Get real-time alerts when documents are opened', status: 'soon' },
          { name: 'HubSpot', desc: 'Sync engagement data to your CRM contacts', status: 'soon' },
          { name: 'Salesforce', desc: 'Log document activity to opportunity records', status: 'soon' },
          { name: 'Zapier', desc: 'Connect to 5000+ apps via Zapier webhooks', status: 'soon' },
        ].map(int => (
          <div key={int.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F3EF' }}>
            <div style={{ width: 36, height: 36, background: '#F5F3EF', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#6B6559', flexShrink: 0 }}>{int.name[0]}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{int.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9C9389' }}>{int.desc}</p>
            </div>
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#F5F3EF', color: '#9C9389', borderRadius: 99, fontWeight: 500 }}>Coming soon</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: '20px 24px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#991B1B', margin: '0 0 6px' }}>Danger zone</h2>
        <p style={{ fontSize: 13, color: '#6B6559', margin: '0 0 14px' }}>Permanently delete your account and all data.</p>
        <Button variant="danger" size="sm">Delete account</Button>
      </div>
    </div>
  )
}
