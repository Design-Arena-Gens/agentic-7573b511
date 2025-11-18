import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF to Video Converter',
  description: 'Convert PDF pages into a video with page-by-page transitions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
