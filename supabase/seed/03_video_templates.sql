-- Video templates: placeholders — video_file_url will be updated after MP4 upload to Supabase Storage
-- Run after uploading templates via: supabase storage cp ./templates/* ss:///templates/

INSERT INTO video_templates (brand_id, name, platform, aspect_ratio, video_file_url, duration_seconds, has_original_audio, is_default)
SELECT
  b.id,
  'Ápice - TikTok 9x16 - Skincare',
  'tiktok',
  '9:16',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/apice-tiktok-skincare.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'apice'

UNION ALL

SELECT
  b.id,
  'Ápice - Meta 1x1 - Skincare',
  'meta',
  '1:1',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/apice-meta-skincare.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'apice'

UNION ALL

SELECT
  b.id,
  'Rituaria - TikTok 9x16 - Wellness',
  'tiktok',
  '9:16',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/rituaria-tiktok-wellness.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'rituaria'

UNION ALL

SELECT
  b.id,
  'Rituaria - Meta 1x1 - Wellness',
  'meta',
  '1:1',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/rituaria-meta-wellness.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'rituaria'

UNION ALL

SELECT
  b.id,
  'Gocase - TikTok 9x16 - Tech',
  'tiktok',
  '9:16',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/gocase-tiktok-tech.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'gocase'

UNION ALL

SELECT
  b.id,
  'Gocase - Meta 1x1 - Tech',
  'meta',
  '1:1',
  'https://placeholder.supabase.co/storage/v1/object/public/templates/gocase-meta-tech.mp4',
  15,
  FALSE,
  TRUE
FROM brands b WHERE b.slug = 'gocase';
