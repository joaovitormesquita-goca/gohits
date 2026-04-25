import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseCSV } from '@/lib/csv/parser'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  const text = await file.text()
  const { rows, errors } = parseCSV(text)

  // Surface header errors immediately (parseCSV already validates required columns)
  const headerError = errors.find((e) => e.includes('Colunas obrigatórias ausentes') || e.includes('CSV vazio'))
  if (headerError) {
    return NextResponse.json({ error: headerError }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nenhuma linha válida encontrada', errors }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Cache brand slugs → ids
  const { data: rawBrands } = await supabase.from('brands').select('id, slug')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brands = (rawBrands ?? []) as any[]
  const brandMap = new Map<string, string>(brands.map((b) => [b.slug, b.id]))

  let imported = 0
  let metrics_inserted = 0
  let skipped = 0

  for (const row of rows) {
    const brand_id = brandMap.get(row.brand_slug)
    if (!brand_id) {
      errors.push(`brand_slug "${row.brand_slug}" não encontrado no banco`)
      skipped++
      continue
    }

    // Upsert content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contentData, error: contentError } = await (supabase.from('contents') as any)
      .upsert(
        {
          brand_id,
          hook: row.hook,
          platform: row.platform,
          name: row.name,
          product: row.product,
          creator: row.creator,
          scenery: row.scenery,
          description: row.description,
          content_description: row.content_description,
          image_url: row.image_url,
          video_url: row.video_url,
          is_hit: true,
        },
        { onConflict: 'brand_id,hook,platform', ignoreDuplicates: false },
      )
      .select('id')
      .single()

    if (contentError || !contentData) {
      errors.push(`Erro ao salvar hit "${row.hook.substring(0, 50)}": ${contentError?.message ?? 'unknown'}`)
      skipped++
      continue
    }

    imported++

    // Insert metrics if any metric data is present
    const hasMetrics =
      row.views != null ||
      row.impressions != null ||
      row.click_count != null ||
      row.spend != null ||
      row.roas != null ||
      row.engagement_rate != null ||
      row.thumbstop_ratio != null

    if (hasMetrics) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: metricsError } = await (supabase.from('content_metrics') as any)
        .insert({
          content_id: (contentData as { id: string }).id,
          date: row.date,
          views: row.views ?? 0,
          impressions: row.impressions ?? 0,
          click_count: row.click_count ?? 0,
          spend: row.spend ?? 0,
          roas: row.roas ?? 0,
          engagement_rate: row.engagement_rate ?? 0,
          thumbstop_ratio: row.thumbstop_ratio ?? 0,
        })

      if (!metricsError) {
        metrics_inserted++
      } else {
        errors.push(`Métricas da linha "${row.hook.substring(0, 30)}": ${metricsError.message}`)
      }
    }
  }

  return NextResponse.json({ imported, metrics_inserted, skipped, errors })
}
