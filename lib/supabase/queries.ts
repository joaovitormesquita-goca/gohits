// Typed query helpers for complex joined queries that the generated types don't cover
import type { Brand, Content, ContentMetrics, VideoTemplate, ContentSuggestion } from './types'

export interface ContentWithRelations extends Content {
  brands: Brand | null
  content_metrics: ContentMetrics[]
}

export interface SuggestionWithRelations extends ContentSuggestion {
  origin_content: ContentWithRelations | null
  target_brand: Brand | null
}

export interface SuggestionWithTargetBrand extends ContentSuggestion {
  target_brand: Brand | null
}

export interface VideoTemplateResult extends VideoTemplate {
  // no extra fields
}
