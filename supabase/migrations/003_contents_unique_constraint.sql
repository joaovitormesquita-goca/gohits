-- Prevents duplicate hooks for the same brand on the same platform.
ALTER TABLE contents ADD CONSTRAINT contents_brand_hook_platform_unique
  UNIQUE (brand_id, hook, platform);
