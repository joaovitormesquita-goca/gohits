export const REQUIRED_HEADERS = ['brand_slug', 'hook', 'platform', 'date'] as const
const VALID_BRAND_SLUGS = ['apice', 'rituaria', 'gocase'] as const
const VALID_PLATFORMS = ['meta', 'tiktok', 'archive'] as const
const MAX_ROWS = 500
const MAX_HOOK_LENGTH = 500

export interface ParsedHitRow {
  brand_slug: 'apice' | 'rituaria' | 'gocase'
  name?: string
  hook: string
  product?: string
  creator?: string
  platform: 'meta' | 'tiktok' | 'archive'
  scenery?: string
  description?: string
  content_description?: string
  image_url?: string
  video_url?: string
  date: string
  views?: number
  impressions?: number
  click_count?: number
  spend?: number
  roas?: number
  engagement_rate?: number
  thumbstop_ratio?: number
}

export interface ParseResult {
  rows: ParsedHitRow[]
  errors: string[]
}

export function validateHeaders(headers: string[]): string[] {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  return REQUIRED_HEADERS.filter((req) => !normalized.includes(req))
}

function parseNum(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined
  const n = Number(value.trim())
  return isNaN(n) ? undefined : n
}

function str(value: string | undefined): string | undefined {
  const v = value?.trim()
  return v === '' ? undefined : v
}

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = {
    ',': (headerLine.match(/,/g) ?? []).length,
    ';': (headerLine.match(/;/g) ?? []).length,
    '\t': (headerLine.match(/\t/g) ?? []).length,
  }
  if (counts[';'] > counts[','] && counts[';'] >= counts['\t']) return ';'
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t'
  return ','
}

function splitCSVLine(line: string, delimiter = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function parseCSV(text: string): ParseResult {
  // Remove BOM if present
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleaned.split('\n').filter((l) => l.trim() !== '')

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV vazio ou sem linhas de dados'] }
  }

  const headerLine = lines[0]
  const delimiter = detectDelimiter(headerLine)
  const headers = splitCSVLine(headerLine, delimiter).map((h) => h.trim().toLowerCase())

  const missingHeaders = validateHeaders(headers)
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`],
    }
  }

  const idx = (col: string) => headers.indexOf(col)
  const dataLines = lines.slice(1, MAX_ROWS + 1)

  const rows: ParsedHitRow[] = []
  const errors: string[] = []

  if (lines.length - 1 > MAX_ROWS) {
    errors.push(`Arquivo tem mais de ${MAX_ROWS} linhas. Apenas as primeiras ${MAX_ROWS} serão importadas.`)
  }

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + 2
    const values = splitCSVLine(dataLines[i], delimiter)
    const get = (col: string) => values[idx(col)]?.trim()

    const brand_slug = get('brand_slug')?.toLowerCase().trim() as 'apice' | 'rituaria' | 'gocase'
    const hook = get('hook')?.trim()
    const platform = get('platform')?.toLowerCase().trim() as 'meta' | 'tiktok' | 'archive'
    const date = get('date')?.trim()

    if (!brand_slug || !VALID_BRAND_SLUGS.includes(brand_slug)) {
      errors.push(`Linha ${lineNum}: brand_slug inválido "${brand_slug}" — use: apice, rituaria ou gocase`)
      continue
    }

    if (!hook) {
      errors.push(`Linha ${lineNum}: hook obrigatório está vazio`)
      continue
    }

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      errors.push(`Linha ${lineNum}: platform inválido "${platform}" — use: meta, tiktok ou archive`)
      continue
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Linha ${lineNum}: date inválido "${date}" — use formato YYYY-MM-DD`)
      continue
    }

    rows.push({
      brand_slug,
      name: str(get('name')),
      hook: hook.substring(0, MAX_HOOK_LENGTH),
      product: str(get('product')),
      creator: str(get('creator')),
      platform,
      scenery: str(get('scenery')),
      description: str(get('description')),
      content_description: str(get('content_description')),
      image_url: str(get('image_url')),
      video_url: str(get('video_url')),
      date,
      views: parseNum(get('views')),
      impressions: parseNum(get('impressions')),
      click_count: parseNum(get('click_count')),
      spend: parseNum(get('spend')),
      roas: parseNum(get('roas')),
      engagement_rate: parseNum(get('engagement_rate')),
      thumbstop_ratio: parseNum(get('thumbstop_ratio')),
    })
  }

  return { rows, errors }
}
