'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

interface BrandSelectorProps {
  brands: { id: string; slug: string; name: string }[]
  className?: string
}

export default function BrandSelector({ brands, className }: BrandSelectorProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const active = searchParams.get('brand') ?? 'all'

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug === 'all') {
      params.delete('brand')
    } else {
      params.set('brand', slug)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className={`flex flex-wrap gap-1.5${className ? ` ${className}` : ''}`}>
      {(['all', ...brands.map((b) => b.slug)] as string[]).map((slug) => {
        const isActive = active === slug
        return (
          <button
            key={slug}
            onClick={() => select(slug)}
            className="text-xs transition-all"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: isActive ? '#2659a5' : '#eaf1fa',
              color: isActive ? '#ffffff' : '#7ba1d8',
              fontWeight: isActive ? 600 : 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {slug === 'all' ? 'Todas as marcas' : brands.find((b) => b.slug === slug)?.name}
          </button>
        )
      })}
    </div>
  )
}
