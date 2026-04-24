# ADR-001: Next.js 15 + Supabase as Full-Stack Foundation

**Status:** Accepted
**Date:** 2026-04-24
**Version:** 1.0

## Context

Máquina de Hits needs to be built quickly as an MVP, deployed internally, and support both a rich interactive UI and server-side AI pipeline orchestration. The team is familiar with the Vercel ecosystem and JavaScript/TypeScript.

## Decision

Use **Next.js 15** (App Router) as the full-stack framework with **Supabase** as the database and auth layer.

- Next.js 15 provides App Router, React Server Components, and API Routes in a single deployment unit — no separate backend needed for MVP.
- Supabase provides PostgreSQL + Auth + Storage + Row-Level Security out of the box, removing the need for a custom auth system.
- Deployment target is Vercel for zero-config CI/CD.

## Consequences

- **Positive:** Single deployment unit reduces operational complexity. Supabase RLS enforces brand data isolation at the DB level. Vercel edge functions available for low-latency operations.
- **Negative:** Long-running AI pipeline steps (video generation) may exceed Vercel's 60s function timeout — will require chunking or background job queue if this becomes a problem.

## History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial decision |
