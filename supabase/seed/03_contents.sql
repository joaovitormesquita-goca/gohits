-- Contents (hits) — idempotente via ON CONFLICT (brand_id, hook, platform)

INSERT INTO contents (id, brand_id, name, product, creator, hook, scenery, description, content_description, platform, is_hit, image_url, video_url, transcription) VALUES

('063ad40f-5100-4398-8fc1-ca5a90596d06',
 'a3f1c820-4d72-4b1e-9c55-d2e8b0f7a001',
 'Sérum Vitamina C - Antes e Depois',
 'Sérum Vitamina C 30ml',
 '@maria.skincare',
 'Eu não acreditava que ia funcionar até o dia 30 chegar',
 'Banheiro iluminado com boa iluminação',
 'Resultado real de 30 dias com Sérum Vitamina C da Ápice. #skincare',
 'Abrir com close no rosto → mostrar sérum → timelapse 30 dias → revelar resultado',
 'tiktok', TRUE,
 'https://exemplo.com/thumb.jpg',
 'https://exemplo.com/video.mp4',
 NULL),

('fe73e45a-9ba1-4b97-af60-adee9ed9d50b',
 'd1f5a172-6c25-4e91-b133-a7e8d4c9d004',
 'Case iPhone Drop Test',
 'Capa iPhone MagSafe',
 '@techtestador',
 'Joguei o iPhone com a case da Gocase do terceiro andar',
 'Prédio, câmera lenta, iPhone caindo',
 'O drop test definitivo da Case MagSafe. #droptest #gocase',
 'Build up com suspense → jogar em câmera lenta → buscar → revelar intacta',
 'tiktok', TRUE,
 NULL, NULL, NULL)

ON CONFLICT (brand_id, hook, platform) DO UPDATE SET
  name               = EXCLUDED.name,
  product            = EXCLUDED.product,
  creator            = EXCLUDED.creator,
  scenery            = EXCLUDED.scenery,
  description        = EXCLUDED.description,
  content_description = EXCLUDED.content_description,
  is_hit             = EXCLUDED.is_hit,
  image_url          = EXCLUDED.image_url,
  video_url          = EXCLUDED.video_url,
  transcription      = EXCLUDED.transcription;
