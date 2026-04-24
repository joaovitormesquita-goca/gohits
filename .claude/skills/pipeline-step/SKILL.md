# Skill: Modify an AI Pipeline Step

## When to Use

When tuning prompts, changing models, or altering input/output contracts for any of the 4 pipeline steps. See ADR-002 before making changes.

## Pipeline Steps Reference

| Step | File | Model | Input | Output |
|------|------|-------|-------|--------|
| 1 — Evaluate | `app/api/evaluate/route.ts` | Claude | Hit content + brand config + references | `{ score: number, rationale: string }` |
| 2 — Adapt | `app/api/adapt/route.ts` | Claude | Hit + brand config + references + step1 output | `{ briefing, hook, roteiro }` |
| 3a — Image | `app/api/image/route.ts` | GPT-image-1 | Step 2 briefing + brand visual refs | `{ imageUrl }` |
| 3b — Video | `app/api/video/route.ts` | ElevenLabs + FFmpeg | Step 2 roteiro | `{ videoUrl }` |

## Prompt Modification Rules

1. **Always inject brand config** — every Claude prompt must include `brand.toneOfVoice` and relevant `brand.products`
2. **Always inject external references** — fetch from Supabase and include as context (ADR-003)
3. **Keep step output schema stable** — if changing output fields, update all downstream consumers
4. **Use prompt caching** — wrap static sections (brand config, system prompt) in cache blocks via the Anthropic SDK

## Pattern: Claude API call with caching

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: [
    {
      type: 'text',
      text: STATIC_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' }, // cache static parts
    },
  ],
  messages: [
    {
      role: 'user',
      content: buildDynamicPrompt(hit, brand, references),
    },
  ],
})
```

## Testing After Changes

1. Run the modified step in isolation via `curl` or a test script
2. Verify output schema matches the TypeScript type
3. Run a full pipeline end-to-end with all 3 brands
4. Check that external references appear in the output reasoning

## Checklist

- [ ] Brand config injected in prompt
- [ ] External references injected in prompt
- [ ] Output schema unchanged (or downstream consumers updated)
- [ ] Prompt caching applied to static sections
- [ ] Full pipeline tested with all 3 brands
