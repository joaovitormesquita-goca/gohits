import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import AppNav from '@/components/AppNav'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GoHit — Inteligência de Hits',
  description: 'Replique hits cross-brand com IA em menos de 24h',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body className="min-h-screen antialiased" style={{ background: '#fbf2e7' }}>
        {/* App shell — cream background */}
        <div className="p-2 sm:p-5" style={{ maxWidth: 1480, margin: '0 auto', minHeight: '100vh' }}>
          {/* Frame — white rounded container */}
          <div
            className="min-h-[calc(100vh-16px)] sm:min-h-[calc(100vh-40px)]"
            style={{
              background: '#ffffff',
              borderRadius: 32,
              overflow: 'clip',
              border: '1px solid rgba(38,89,165,0.14)',
            }}
          >
            <AppNav />
            <main className="px-4 sm:px-8 pt-6 sm:pt-7 pb-10 sm:pb-12">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
