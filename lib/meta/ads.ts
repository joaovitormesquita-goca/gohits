const META_API_BASE = 'https://graph.facebook.com/v21.0'

const token = () => process.env.META_ACCESS_TOKEN!
const adAccountId = () => process.env.META_AD_ACCOUNT_ID!
const pageId = () => process.env.META_PAGE_ID!

async function metaGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', token())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Meta GET ${path} failed`)
  return data
}

async function metaPost(path: string, body: Record<string, string>) {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', token())
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `Meta POST ${path} failed`)
  return data
}

// Get all adsets for a campaign
async function getAdsets(campaignId: string): Promise<Array<{ id: string; name: string }>> {
  const data = await metaGet(`/${campaignId}/adsets`, {
    fields: 'id,name',
    limit: '50',
  })
  return data.data ?? []
}

// Count active ads in an adset
async function countAdsInAdset(adsetId: string): Promise<number> {
  const data = await metaGet(`/${adsetId}/ads`, {
    summary: 'true',
    limit: '1',
  })
  return data.summary?.total_count ?? 0
}

// Duplicate an adset (empty copy, paused)
async function duplicateAdset(adsetId: string): Promise<string> {
  const data = await metaPost(`/${adsetId}/copies`, {
    rename_strategy: 'EXACT_COPY',
    status_option: 'PAUSED',
  })
  if (!data.copied_adset_id) throw new Error('Adset duplication returned no ID')
  return data.copied_adset_id as string
}

// Upload image and create ad creative
async function createAdCreative(imageUrl: string, title: string, body: string): Promise<string> {
  // Step 1: Upload image from URL
  const uploadData = await metaPost(`/${adAccountId()}/adimages`, {
    url: imageUrl,
  })
  // Meta returns { images: { [filename]: { hash } } }
  const images = uploadData.images as Record<string, { hash: string }> | undefined
  const imageHash = images ? Object.values(images)[0]?.hash : undefined
  if (!imageHash) throw new Error('Image upload returned no hash')

  // Step 2: Create creative
  const creativeData = await metaPost(`/${adAccountId()}/adcreatives`, {
    name: title.substring(0, 100),
    object_story_spec: JSON.stringify({
      page_id: pageId(),
      link_data: {
        image_hash: imageHash,
        message: body,
        name: title,
        call_to_action: JSON.stringify({ type: 'LEARN_MORE' }),
      },
    }),
  })
  if (!creativeData.id) throw new Error('Ad creative creation returned no ID')
  return creativeData.id as string
}

// Create an ad in a given adset using an existing creative
async function createAd(adsetId: string, creativeId: string, name: string): Promise<string> {
  const data = await metaPost(`/${adAccountId()}/ads`, {
    name: name.substring(0, 100),
    adset_id: adsetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'PAUSED',
  })
  if (!data.id) throw new Error('Ad creation returned no ID')
  return data.id as string
}

export interface AdCreativeInput {
  imageUrl: string
  title: string
  body: string
}

export interface PublishResult {
  ad_id: string
  adset_id: string
  created_new_adset: boolean
}

// Main orchestrator: find right adset, create creative, create ad
export async function publishImageAd(
  campaignId: string,
  creative: AdCreativeInput,
  maxAdsPerAdset: number,
): Promise<PublishResult> {
  const adsets = await getAdsets(campaignId)
  if (adsets.length === 0) throw new Error('Campanha não tem adsets. Crie um adset base primeiro.')

  // Use most recent adset (last in list)
  const latestAdset = adsets[adsets.length - 1]
  const adCount = await countAdsInAdset(latestAdset.id)

  let targetAdsetId: string
  let created_new_adset = false

  if (adCount < maxAdsPerAdset) {
    targetAdsetId = latestAdset.id
  } else {
    targetAdsetId = await duplicateAdset(latestAdset.id)
    created_new_adset = true
  }

  const creativeId = await createAdCreative(creative.imageUrl, creative.title, creative.body)
  const adId = await createAd(targetAdsetId, creativeId, creative.title)

  return { ad_id: adId, adset_id: targetAdsetId, created_new_adset }
}

export interface AdInsights {
  ctr: number
  impressions: number
  spend: number
  reach: number
  date: string
}

// Fetch today's insights for a specific ad
export async function getAdInsights(adId: string): Promise<AdInsights> {
  const data = await metaGet(`/${adId}/insights`, {
    fields: 'ctr,impressions,spend,reach',
    date_preset: 'today',
  })
  const row = data.data?.[0] ?? {}
  return {
    ctr: parseFloat(row.ctr ?? '0'),
    impressions: parseInt(row.impressions ?? '0', 10),
    spend: parseFloat(row.spend ?? '0'),
    reach: parseInt(row.reach ?? '0', 10),
    date: new Date().toISOString().split('T')[0],
  }
}
