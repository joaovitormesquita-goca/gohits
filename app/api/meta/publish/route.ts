import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { publishImageAd } from '@/lib/meta/ads'

export async function POST(req: NextRequest) {
  const { suggestionId } = await req.json()

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID || !process.env.META_CAMPAIGN_ID) {
    return NextResponse.json(
      { error: 'Variáveis de ambiente Meta Ads não configuradas (META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_CAMPAIGN_ID)' },
      { status: 500 },
    )
  }

  const supabase = await createAdminClient()

  const { data: rawSuggestion } = await supabase
    .from('content_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestion = rawSuggestion as any

  if (!suggestion) {
    return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 })
  }

  if (!suggestion.image_url) {
    return NextResponse.json({ error: 'Sugestão não tem imagem gerada' }, { status: 400 })
  }

  if (suggestion.meta_status === 'in_test' || suggestion.meta_ad_id) {
    return NextResponse.json({ error: 'Ad já publicado no Facebook Ads', ad_id: suggestion.meta_ad_id }, { status: 409 })
  }

  const maxAds = parseInt(process.env.META_ADSET_MAX_ADS ?? '10', 10)

  const result = await publishImageAd(
    process.env.META_CAMPAIGN_ID,
    {
      imageUrl: suggestion.image_url,
      title: suggestion.name ?? suggestion.hook ?? 'Criativo Gohit',
      body: suggestion.hook ?? '',
    },
    maxAds,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('content_suggestions') as any)
    .update({
      meta_ad_id: result.ad_id,
      meta_adset_id: result.adset_id,
      meta_status: 'in_test',
      status: 'in_play',
    })
    .eq('id', suggestionId)

  const adsManagerUrl = `https://www.facebook.com/adsmanager/manage/ads?act=${process.env.META_AD_ACCOUNT_ID?.replace('act_', '')}&selected_ad_ids=${result.ad_id}`

  return NextResponse.json({ ...result, ads_manager_url: adsManagerUrl })
}
