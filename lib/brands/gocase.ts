import type { BrandConfig } from './types'

const gocase: BrandConfig = {
  slug: 'gocase',
  displayName: 'Gocase',
  toneOfVoice:
    'Descolado, jovem, divertido e criativo. Fala com Gen Z e Millennials que expressam personalidade pelos acessórios e usam tech no cotidiano. Referências de pop culture, trends e drops são naturais. Humor e ousadia são bem-vindos.',
  products: [
    'Capa iPhone Clear',
    'Capa iPhone MagSafe',
    'Capa iPhone Silicone',
    'Case Personalizada iPhone',
    'Capas para Samsung',
    'Case para MacBook',
    'Mochila Tech Gocase',
    'Carteira MagSafe Gocase',
    'Pelúcias Colecionáveis',
    'Fones de Ouvido Estilizados',
    'Carregadores e Cabos Coloridos',
  ],
  promptModifiers: [
    'Use linguagem jovem e direta, pode usar gírias leves (incrível, melhor, hype)',
    'Pop culture, trends do TikTok e referências de internet são bem-vindos',
    'Drops limitados, exclusividade e colecionabilidade são argumentos fortes',
    'Personalização e expressão de identidade são diferenciais centrais',
    'Humor e situações do cotidiano tech funcionam bem (setup, homeoffice, commute)',
    'Não use linguagem corporativa, formal ou distante',
    'Resistência e funcionalidade devem vir junto com estilo — não apenas um ou outro',
  ],
  elevenlabsVoiceId: 'onwK4e9ZLuTAKqWW03F9',
  defaultOutputMode: 'image',
  colorPalette: { primary: '#ff6b35', secondary: '#1a1a2e' },
}

export default gocase
