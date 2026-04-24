-- BRANDS
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  context TEXT,
  products_context TEXT,
  elevenlabs_voice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENTS (hits base)
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  product TEXT,
  brand_id UUID REFERENCES brands(id) NOT NULL,
  creator TEXT,
  image_url TEXT,
  video_url TEXT,
  video_file TEXT,
  transcription TEXT,
  scenery TEXT,
  hook TEXT,
  description TEXT,
  content_description TEXT,
  platform TEXT CHECK (platform IN ('meta','tiktok','archive')),
  is_hit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT METRICS
CREATE TABLE content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  click_count INT DEFAULT 0,
  impressions INT DEFAULT 0,
  views INT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  thumbstop_ratio NUMERIC(6,4) DEFAULT 0,
  ctr NUMERIC(6,4) GENERATED ALWAYS AS
    (CASE WHEN impressions > 0 THEN click_count::numeric / impressions ELSE 0 END) STORED,
  roas NUMERIC(8,4) DEFAULT 0,
  engagement_rate NUMERIC(6,4) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIDEO TEMPLATES
CREATE TABLE video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) NOT NULL,
  name TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('tiktok','meta','archive')),
  aspect_ratio TEXT CHECK (aspect_ratio IN ('9:16','1:1','16:9')),
  video_file_url TEXT NOT NULL,
  duration_seconds NUMERIC(5,2),
  has_original_audio BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXTERNAL REFERENCES (criada no schema, não usada no MVP — pós-MVP ADR-003)
CREATE TABLE external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  source_brand TEXT,
  creator TEXT,
  platform TEXT CHECK (platform IN ('tiktok','meta','youtube','instagram','other')),
  category TEXT,
  video_url TEXT,
  thumb_url TEXT,
  hook TEXT,
  description TEXT,
  transcription TEXT,
  approx_views INT,
  approx_engagement NUMERIC(6,4),
  tags TEXT[],
  notes TEXT,
  added_by TEXT,
  import_batch_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT SUGGESTIONS
CREATE TABLE content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_content_id UUID REFERENCES contents(id),
  origin_brand_id UUID REFERENCES brands(id),
  target_brand_id UUID REFERENCES brands(id) NOT NULL,
  platform TEXT,
  is_replicable BOOLEAN NOT NULL,
  replicability_reason TEXT,
  name TEXT,
  product TEXT,
  creator TEXT,
  transcription TEXT,
  scenery TEXT,
  hook TEXT,
  description TEXT,
  content_description TEXT,
  briefing TEXT,
  output_mode TEXT CHECK (output_mode IN ('image','video')),
  image_url TEXT,
  audio_url TEXT,
  video_template_id UUID REFERENCES video_templates(id),
  final_video_url TEXT,
  external_references_used UUID[],
  estimated_ctr NUMERIC(6,4),
  estimated_roas NUMERIC(8,4),
  estimated_views INT,
  estimated_impact_score NUMERIC(5,2),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','approved','rejected','in_play','published','not_replicable')),
  ai_model_version TEXT,
  ai_generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(origin_content_id, target_brand_id, output_mode)
);

-- ALERTS
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('hit','daily_report')),
  content_id UUID REFERENCES contents(id),
  brand_id UUID REFERENCES brands(id),
  message_formatted TEXT NOT NULL,
  sent_whatsapp BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_contents_brand ON contents(brand_id);
CREATE INDEX idx_metrics_content_date ON content_metrics(content_id, date DESC);
CREATE INDEX idx_suggestions_target_status ON content_suggestions(target_brand_id, status);
CREATE INDEX idx_suggestions_origin ON content_suggestions(origin_content_id);
CREATE INDEX idx_video_templates_brand_platform ON video_templates(brand_id, platform);
CREATE INDEX idx_external_category ON external_references(category);
CREATE INDEX idx_external_platform ON external_references(platform);
CREATE INDEX idx_external_tags ON external_references USING GIN(tags);

-- VIEW: Xadrez de Replicação
CREATE OR REPLACE VIEW v_replication_matrix AS
SELECT
  c.id           AS content_id,
  c.name         AS content_name,
  c.hook,
  c.image_url,
  c.brand_id     AS origin_brand_id,
  bo.name        AS origin_brand_name,
  bo.slug        AS origin_brand_slug,
  bt.id          AS target_brand_id,
  bt.name        AS target_brand_name,
  bt.slug        AS target_brand_slug,
  s.id           AS suggestion_id,
  s.status,
  s.is_replicable,
  s.output_mode,
  s.estimated_impact_score
FROM contents c
CROSS JOIN brands bt
JOIN brands bo ON bo.id = c.brand_id
LEFT JOIN content_suggestions s
  ON s.origin_content_id = c.id AND s.target_brand_id = bt.id
WHERE c.is_hit = TRUE
  AND bo.id <> bt.id;
