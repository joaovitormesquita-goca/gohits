// Run: npx tsx scripts/pregenerate-all.ts
// Requires .env.local with all keys set.
// Generates all 60 suggestions (30 hits × 2 target brands each).

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DELAY_MS = 2000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function run() {
  console.log('🚀 Pregenerate All — 60 sugestões\n')

  const { data: contents } = await supabase
    .from('contents')
    .select('id, name, brand_id, hook')
    .eq('is_hit', true)

  const { data: brands } = await supabase.from('brands').select('id, slug, name')

  if (!contents || !brands) {
    console.error('❌ Falha ao buscar hits ou brands do DB')
    process.exit(1)
  }

  console.log(`📦 ${contents.length} hits × ${brands.length - 1} marcas destino cada = ${contents.length * (brands.length - 1)} combinações\n`)

  let done = 0
  let skipped = 0
  let failed = 0

  for (const content of contents) {
    const targetBrands = brands.filter((b) => b.id !== content.brand_id)

    for (const targetBrand of targetBrands) {
      const outputMode = Math.random() > 0.5 ? 'image' : 'video'

      // Check if already generated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('content_suggestions') as any)
        .select('id, status')
        .eq('origin_content_id', content.id)
        .eq('target_brand_id', targetBrand.id)
        .eq('output_mode', outputMode)
        .maybeSingle()

      if (existing?.status && existing.status !== 'not_replicable') {
        console.log(`⏩ Skip: ${content.name?.substring(0, 30)} → ${targetBrand.name} (${outputMode}) — já existe`)
        skipped++
        continue
      }

      console.log(`⚡ Gerando: ${content.name?.substring(0, 30)} → ${targetBrand.name} (${outputMode})`)

      try {
        const res = await fetch(`${BASE_URL}/api/pipeline/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originContentId: content.id,
            targetBrandId: targetBrand.id,
            outputMode,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? `HTTP ${res.status}`)
        }

        const data = await res.json()
        console.log(`  ✅ Status: ${data.status}`)
        done++
      } catch (err) {
        console.error(`  ❌ Falhou: ${err}`)
        failed++
      }

      await sleep(DELAY_MS)
    }
  }

  console.log(`\n📊 Resultado:`)
  console.log(`  ✅ Geradas: ${done}`)
  console.log(`  ⏩ Puladas: ${skipped}`)
  console.log(`  ❌ Falhas: ${failed}`)
  console.log(`  Total processado: ${done + skipped + failed}`)
}

run().catch(console.error)
