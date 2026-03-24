import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          title: string
          content: string | null
          type: 'document' | 'pitch_deck' | 'proposal'
          status: 'draft' | 'active' | 'archived'
          user_id: string
          cover_emoji: string | null
          created_at: string
          updated_at: string
          total_views: number
          total_time_seconds: number
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_views' | 'total_time_seconds'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      share_links: {
        Row: {
          id: string
          document_id: string
          token: string
          label: string | null
          password: string | null
          require_email: boolean
          allow_download: boolean
          expires_at: string | null
          is_active: boolean
          view_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['share_links']['Row'], 'id' | 'created_at' | 'view_count'>
        Update: Partial<Database['public']['Tables']['share_links']['Insert']>
      }
      view_sessions: {
        Row: {
          id: string
          share_link_id: string
          document_id: string
          viewer_email: string | null
          viewer_name: string | null
          viewer_ip: string | null
          viewer_location: string | null
          device_type: string | null
          referrer: string | null
          parent_session_id: string | null
          started_at: string
          ended_at: string | null
          total_time_seconds: number
          pages_viewed: number
          completion_rate: number
          engagement_score: number
        }
        Insert: Omit<Database['public']['Tables']['view_sessions']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['view_sessions']['Insert']>
      }
      page_events: {
        Row: {
          id: string
          session_id: string
          document_id: string
          page_number: number
          event_type: 'enter' | 'exit' | 'focus' | 'blur'
          time_spent_seconds: number
          scroll_depth: number
          timestamp: string
        }
        Insert: Omit<Database['public']['Tables']['page_events']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['page_events']['Insert']>
      }
    }
  }
}
