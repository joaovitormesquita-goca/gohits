# Skill: Add a New Brand

## When to Use

When adding a new portfolio brand to the replication system (beyond Apice, Rituaria, Gocase).

## Steps

### 1. Create brand config file

Create `lib/brands/<slug>.ts`:

```typescript
import type { BrandConfig } from './types'

export const brandSlug: BrandConfig = {
  slug: 'brand-slug',
  displayName: 'Brand Name',
  toneOfVoice: `
    [2-3 paragraph description of brand personality, communication style,
    target audience, and content approach — used directly in AI prompts]
  `,
  products: [
    'Category 1: product examples',
    'Category 2: product examples',
  ],
  promptModifiers: [
    'Always mention [brand-specific differentiator]',
    'Avoid [topic that conflicts with brand values]',
  ],
  colorPalette: {
    primary: '#XXXXXX',
    secondary: '#XXXXXX',
  },
}
```

### 2. Register in brand index

Add to `lib/brands/index.ts`:

```typescript
import { brandSlug } from './<slug>'
export const brands = { ..., '<slug>': brandSlug }
```

### 3. Verify type safety

Run `npm run type-check` — `BrandConfig` type will surface any missing required fields.

### 4. Test the pipeline

Run a replication with the new brand as destination and verify:
- Briefing reflects brand tone
- Product references are from the correct catalog
- No references to other brands leak through

## Checklist

- [ ] `lib/brands/<slug>.ts` created with all required fields
- [ ] Brand registered in `lib/brands/index.ts`
- [ ] `npm run type-check` passes
- [ ] Manual pipeline test with new brand as destination
