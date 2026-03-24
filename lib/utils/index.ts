import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateToken(length = 12): string {
  return nanoid(length)
}

export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export function computeEngagementScore(params: {
  completionRate: number
  avgTimePerPage: number
  revisitCount: number
  hasForwarded: boolean
}): number {
  const { completionRate, avgTimePerPage, revisitCount, hasForwarded } = params
  let score = 0
  score += completionRate * 40
  const timeScore = Math.min(avgTimePerPage / 120, 1) * 30
  score += timeScore
  score += Math.min(revisitCount * 5, 20)
  if (hasForwarded) score += 10
  return Math.round(Math.min(score, 100))
}

export function getEngagementLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Highly engaged', color: '#16A34A' }
  if (score >= 60) return { label: 'Engaged', color: '#DC6B19' }
  if (score >= 40) return { label: 'Moderate', color: '#D97706' }
  if (score >= 20) return { label: 'Low', color: '#6B6559' }
  return { label: 'Minimal', color: '#9C9389' }
}

export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    document: 'Document',
    pitch_deck: 'Pitch Deck',
    proposal: 'Proposal',
  }
  return labels[type] ?? 'Document'
}

export function getDocumentTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    document: '📄',
    pitch_deck: '🚀',
    proposal: '💼',
  }
  return emojis[type] ?? '📄'
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function buildShareUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/view/${token}`
}
