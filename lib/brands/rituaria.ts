import type { BrandConfig } from './types'

const rituaria: BrandConfig = {
  slug: 'rituaria',
  displayName: 'Rituaria',
  toneOfVoice:
    'Acolhedor, poético e inspiracional. Fala com mulheres conscientes que valorizam slow living, ingredientes naturais e autocuidado com propósito. Linguagem que convida à pausa, à presença, à conexão com o próprio corpo. Sustentabilidade é um valor central.',
  products: [
    'Óleo de Banho Lavanda & Camomila',
    'Esfoliante Corporal de Açúcar e Baunilha',
    'Creme Corporal Manteiga de Karité',
    'Vela Aromática Ritual da Noite',
    'Vela Aromática Ritual da Manhã',
    'Sabonete Artesanal em Barra',
    'Hidratante Corporal Floral',
    'Bruma Corporal Perfumada',
    'Kit Ritual do Banho',
  ],
  promptModifiers: [
    'Use linguagem sensorial: aromas, texturas, calor, vapor, suavidade',
    'Fale de ritual, pausa intencional, momento para si, presença',
    'Ingredientes naturais devem ser mencionados com carinho (lavanda, camomila, açúcar, karité)',
    'Não use linguagem fria, técnica ou muito acelerada',
    'Não faça promessas agressivas de resultados rápidos',
    'Sustentabilidade e artesanal são diferenciais — mencione quando pertinente',
    'O desfecho emocional é tão importante quanto o produto',
  ],
  elevenlabsVoiceId: 'EXAVITQu4vr4xnSDe4oz',
  defaultOutputMode: 'video',
  colorPalette: { primary: '#3d2b1f', secondary: '#f5e6d3' },
}

export default rituaria
