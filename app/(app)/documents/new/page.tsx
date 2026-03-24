'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function NewDocumentPage() {
  const router = useRouter()
  useEffect(() => {
    async function create() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('documents').insert({
        title: 'Untitled',
        type: 'document',
        user_id: user.id,
        cover_emoji: '📄',
        status: 'draft',
      }).select().single()
      if (data) router.push(`/documents/${data.id}`)
    }
    create()
  }, [router])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E5E0D8', borderTopColor: '#DC6B19', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#9C9389' }}>Creating document…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
