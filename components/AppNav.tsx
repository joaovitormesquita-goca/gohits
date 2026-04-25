'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/planejamento', label: 'Planejamento' },
  { href: '/analise-hits', label: 'Análise de Hits' },
  { href: '/imagens', label: 'Imagens' },
  { href: '/xadrez', label: 'Xadrez' },
  { href: '/alertas', label: 'Alertas' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex items-center gap-3 sm:gap-5 px-3 sm:px-6 py-3 sm:py-3.5 sticky top-0 z-50 flex-wrap"
      style={{ background: '#2659a5', color: 'white' }}
    >
      {/* Brand mark */}
      <Link href="/planejamento" className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          className="flex items-center justify-center font-extrabold text-xl shrink-0"
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#d7d900', color: '#2659a5',
          }}
        >
          G
        </div>
        <div>
          <div className="font-bold text-lg leading-none tracking-tight text-white">GoHit</div>
          <div
            className="text-[10px] font-semibold tracking-[0.14em] uppercase mt-0.5"
            style={{ color: 'rgba(215,217,0,0.9)' }}
          >
            Inteligência · Gogroup
          </div>
        </div>
      </Link>

      {/* Tabs */}
      <div
        className="flex gap-0.5 rounded-full p-1 overflow-x-auto order-last w-full sm:w-auto sm:order-none scrollbar-none"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0"
              style={isActive
                ? { background: '#d7d900', color: '#2659a5', fontWeight: 600 }
                : { color: 'rgba(255,255,255,0.72)' }
              }
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Admin link */}
      <div className="ml-auto flex items-center gap-4">
        <Link
          href="/hits"
          className="text-xs font-medium transition-colors"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
        >
          Admin
        </Link>
        {/* Avatar */}
        <div
          className="flex items-center justify-center font-bold text-sm shrink-0"
          style={{
            width: 34, height: 34, borderRadius: 999,
            background: '#d7d900', color: '#2659a5',
          }}
        >
          GH
        </div>
      </div>
    </nav>
  )
}
