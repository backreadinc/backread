import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Folio', template: '%s · Folio' },
  description: 'Send documents. See everything. Know what to do next.',
  keywords: ['document tracking', 'pitch deck', 'proposal', 'analytics', 'sharing'],
  openGraph: {
    title: 'Folio',
    description: 'Send documents. See everything. Know what to do next.',
    type: 'website',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
