-- Brands — idempotente via ON CONFLICT (slug)
-- Rodar via: supabase db reset  (aplica migrations + seed.sql)

INSERT INTO brands (id, slug, name, context, products_context, elevenlabs_voice_id) VALUES

('a3f1c820-4d72-4b1e-9c55-d2e8b0f7a001', 'apice', 'Ápice',
'Ápice é uma marca brasileira de cosméticos veganos para cabelos naturais, cacheados e crespos, voltada para mulheres que buscam empoderamento capilar e autoaceitação. Tom de voz: acolhedor, empoderador, educativo e próximo. Persona: mulher entre 20 e 40 anos, com cabelos naturais ou em transição capilar, consciente sobre ingredientes, engajada com a comunidade curly e com pauta sustentável. Ticket: acessível a mid. DO: celebrar a diversidade de cachos e crespos, comunicar ativos e diferenciais técnicos (Low/NoPoo, vegano, cruelty-free), incentivar o questionário de diagnóstico capilar, usar linguagem de comunidade e pertencimento. DON''T: usar linguagem de alisamento ou química agressiva, prometer resultados milagrosos sem embasamento técnico, ignorar a diversidade de texturas e tons de pele.',
'Linhas principais: Crespo Power (shampoo, co-wash, condicionador acidificante, mousse, gelatina, creme de pentear), Juba, Jubinha Infantil, Operação Resgate, Phytomanga, Sete Óleos, Infusão 2.0, Pérolas de Caviar, Argan Oil, Banho de Colágeno. SKUs incluem shampoos, condicionadores, cremes de pentear, géis definidores e óleos. Categorias: tratamento capilar, definição de cachos, hidratação, nutrição, linha infantil.',
NULL),

('b7d2e940-1a83-4c6f-8e11-f4c9d3a2b002', 'barbours', 'Barbours',
'Barbours é uma marca brasileira de beleza e dermocosméticos fundada em 2018, voltada para consumidores que desejam sofisticação sensorial com preço acessível. Tom de voz: sofisticado, sensorial, aspiracional e feminino. Persona: mulher entre 18 e 45 anos, apreciadora de fragrâncias marcantes e produtos de beleza elaborados, que busca referências premium sem pagar preço de luxo. Ticket: acessível a mid. DO: destacar a exclusividade das composições olfativas, usar referências sensoriais ricas, valorizar texturas e a experiência de uso, comunicar biocompatibilidade e inovação das fórmulas. DON''T: alegar que os produtos são idênticos às fragrâncias de luxo que inspiram, vincular a marca a nomes de terceiros de forma enganosa, comunicar de forma genérica ou sem apelo emocional.',
'Linhas principais: Body Splash (Roses, Seduction Homme, Acqua Homme), Perfume Capilar La Vie, Iluminador Corporal Golden Glow, hidratantes corporais, séruns faciais, cremes para estrias e uniformizadores de tom, shampoos e condicionadores. Kits presenteáveis disponíveis. Categorias: fragrâncias corporais, perfumaria capilar, skincare facial, cuidados corporais, kits presente.',
NULL),

('c9e4f061-5b14-4d80-a022-e6d7c5b8c003', 'rituaria', 'Rituária',
'Rituária é uma marca brasileira de dermocosméticos e suplementos funcionais criada em 2021, voltada para consumidores que buscam autocuidado com ciência, transparência de fórmula e resultados comprovados. Tom de voz: transparente, técnico-acessível, encorajador e honesto. Persona: mulher entre 22 e 45 anos, antenada em saúde integrativa e skincare, que pesquisa ingredientes ativos, segue profissionais de saúde nas redes e quer uma rotina de bem-estar eficaz e descomplicada. Ticket: mid. DO: detalhar ativos e mecanismos de ação, reforçar que as fórmulas são veganas, cruelty-free e sem parabenos/sulfatos/silicones, comunicar embasamento científico e garantia de 60 dias, valorizar o atendimento humanizado. DON''T: prometer resultados milagrosos ou sem comprovação, omitir composição das fórmulas, usar linguagem excessivamente técnica sem tradução acessível.',
'Suplementos principais: Fórmula 4Mag (magnésio quelado em 4 formas: Malato, Bisglicinato, Citrato e Taurato + B6 e Treonina — carro-chefe da marca), Prebiótica, Coenzima Q10, Antioxi Nutri. Suplementação organizada em verticais: intestino, emagrecimento, longevidade, energia, sono, foco, imunidade, saúde da mulher/homem. Skincare: sérum clareador, The Golden Stick (base com FPS), cápsulas anti-oxi. Categorias: suplementos funcionais, dermocosméticos faciais, skincare ativo.',
NULL),

('d1f5a172-6c25-4e91-b133-a7e8d4c9d004', 'gocase', 'Gocase',
'Gocase é uma lovebrand brasileira nativa digital, fundada em 2015, especializada em acessórios personalizados com foco em expressão de identidade, moda e criatividade, voltada principalmente para mulheres entre 20 e 35 anos das gerações Y e Z. Tom de voz: descolado, criativo, inclusivo, animado e próximo da comunidade. Persona: jovem urbano/a, ativo/a nas redes sociais, que usa produtos como extensão da personalidade, aprecia arte, diversidade e colaborações exclusivas com ilustradores e licenciamentos. Ticket: acessível a mid. DO: celebrar diversidade e autoexpressão, explorar licenciamentos criativos (Disney, times de futebol, artistas), incentivar personalização com nome/foto, manter lançamentos frequentes de estampas. DON''T: comunicar de forma genérica ou sem apelo criativo, ignorar a identidade da comunidade Golovers, adotar tom corporativo ou distante.',
'Linhas principais: capinhas personalizadas para celular (iPhone, Samsung etc.), cases para AirPods e notebooks, garrafas térmicas personalizadas, bolsas e mochilas de viagem, lancheiras, linha GoPets (acessórios para pets), cadernos, grips e carregadores. Cerca de 90% do faturamento vem de produtos personalizados. Categorias: capas para dispositivos, acessórios de moda, produtos térmicos, viagem e lifestyle, linha pet.',
NULL)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  context = EXCLUDED.context,
  products_context = EXCLUDED.products_context,
  elevenlabs_voice_id = EXCLUDED.elevenlabs_voice_id;
