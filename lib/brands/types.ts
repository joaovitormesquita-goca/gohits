export interface BrandConfig {
  slug: 'apice' | 'rituaria' | 'gocase'
  displayName: string
  toneOfVoice: string
  products: string[]
  promptModifiers: string[]
  elevenlabsVoiceId: string
  defaultOutputMode: 'image' | 'video'
  colorPalette: { primary: string; secondary: string }
}
