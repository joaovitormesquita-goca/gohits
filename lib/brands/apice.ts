import type { BrandConfig } from './types'

const apice: BrandConfig = {
  slug: 'apice',
  displayName: 'Ápice',
  toneOfVoice:
    'Sofisticado, confiante e educativo. Fala com mulheres de 25-45 anos que investem em skincare de alta performance. Prioriza resultados visíveis, ingredientes ativos e ciência por trás do produto. Linguagem cuidada, sem ser fria — próxima, mas premium.',
  products: [
    'Sérum Vitamina C 30ml',
    'Sérum Vitamina C 60ml',
    'Creme Anti-idade Redentor',
    'Hidratante Facial FPS50',
    'Tônico Equilibrante',
    'Máscara Detox de Argila',
    'Óleo Facial de Rosas',
    'Protetor Solar Luminous',
    'Esfoliante Suave Iluminador',
  ],
  promptModifiers: [
    'Mencione ingredientes ativos quando relevante (Vitamina C, Retinol, Ácido Hialurônico)',
    'Resultados devem ser específicos e mensuráveis (ex: manchas em X dias, pele X% mais hidratada)',
    'Use antes e depois, transformação, resultados reais como estrutura narrativa',
    'Não use linguagem muito casual ou gírias excessivas',
    'Não compare negativamente com concorrentes por nome',
    'Foco em benefícios da pele, não em estética superficial',
  ],
  elevenlabsVoiceId: 'pNInz3Z91uDbnQZ3B4aQ',
  defaultOutputMode: 'image',
  colorPalette: { primary: '#1a1a2e', secondary: '#e8c4b8' },
}

export default apice
