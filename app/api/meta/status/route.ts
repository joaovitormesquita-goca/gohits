import { NextResponse } from 'next/server'

export async function GET() {
  const configured = Boolean(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_AD_ACCOUNT_ID &&
    process.env.META_CAMPAIGN_ID &&
    process.env.META_PAGE_ID
  )
  return NextResponse.json({ configured })
}
