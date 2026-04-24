export const CSV_HEADERS = [
  'brand_slug',
  'name',
  'hook',
  'product',
  'creator',
  'platform',
  'scenery',
  'description',
  'content_description',
  'image_url',
  'video_url',
  'date',
  'views',
  'impressions',
  'click_count',
  'spend',
  'roas',
  'engagement_rate',
  'thumbstop_ratio',
] as const

const CSV_EXAMPLE_ROWS = [
  [
    'apice',
    'Sérum Vitamina C - Antes e Depois',
    'Eu não acreditava que ia funcionar até o dia 30 chegar',
    'Sérum Vitamina C 30ml',
    '@maria.skincare',
    'tiktok',
    'Banheiro iluminado com boa iluminação',
    'Resultado real de 30 dias com Sérum Vitamina C da Ápice. #skincare',
    'Abrir com close no rosto → mostrar sérum → timelapse 30 dias → revelar resultado',
    'https://exemplo.com/thumb.jpg',
    'https://exemplo.com/video.mp4',
    '2026-04-01',
    '234000',
    '1200000',
    '15000',
    '5400',
    '4.2',
    '0.087',
    '0.22',
  ],
  [
    'gocase',
    'Case iPhone Drop Test',
    'Joguei o iPhone com a case da Gocase do terceiro andar',
    'Capa iPhone MagSafe',
    '@techtestador',
    'tiktok',
    'Prédio, câmera lenta, iPhone caindo',
    'O drop test definitivo da Case MagSafe. #droptest #gocase',
    'Build up com suspense → jogar em câmera lenta → buscar → revelar intacta',
    '',
    '',
    '2026-04-15',
    '890000',
    '3400000',
    '42000',
    '8200',
    '6.1',
    '0.124',
    '0.31',
  ],
]

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCSVContent(): string {
  const lines: string[] = [CSV_HEADERS.join(',')]
  for (const row of CSV_EXAMPLE_ROWS) {
    lines.push(row.map(escapeCsvValue).join(','))
  }
  return lines.join('\n')
}

export function downloadTemplate(): void {
  const content = buildCSVContent()
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'gohit-hits-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
