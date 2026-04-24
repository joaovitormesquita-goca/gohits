-- Migration 003: Meta Ads tracking columns for content_suggestions
ALTER TABLE content_suggestions
  ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_adset_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_status TEXT
    CHECK (meta_status IN ('pending', 'in_test', 'result_available'))
    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_suggestions_meta_ad ON content_suggestions(meta_ad_id)
  WHERE meta_ad_id IS NOT NULL;
