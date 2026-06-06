import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import AppNav from '@/components/AppNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NR18 SaaS',
  description: 'Sistema de vistoria e checklist NR-18 com IA',
  themeColor: '#185FA5',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body className={inter.className}>
        <AppNav>
          {children}
        </AppNav>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            },
          }}
        />
      </body>
    </html>
  )
}
