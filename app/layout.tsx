import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Gohit — Hub de Replicação Cross-Brand',
  description: 'Replique hits entre Ápice, Rituaria e Gocase com IA em <24h',
}

const TABS = [
  { href: '/planejamento', label: 'Planejamento' },
  { href: '/analise-hits', label: 'Análise de Hits' },
  { href: '/xadrez', label: 'Xadrez' },
  { href: '/alertas', label: 'Alertas' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8 h-14">
              <Link href="/planejamento" className="font-bold text-lg tracking-tight">
                🎯 Gohit
              </Link>
              <nav className="flex items-center gap-1">
                {TABS.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/hits" className="hover:text-foreground transition-colors">Admin</Link>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
