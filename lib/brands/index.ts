import apice from './apice'
import rituaria from './rituaria'
import gocase from './gocase'
import type { BrandConfig } from './types'

export const brandRegistry: Record<string, BrandConfig> = {
  apice,
  rituaria,
  gocase,
}

export function getBrandConfig(slug: string): BrandConfig | undefined {
  return brandRegistry[slug]
}

export type { BrandConfig }
export { apice, rituaria, gocase }
