import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ФСП · Основа платформы',
  other: {
    'color-scheme': 'dark',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
