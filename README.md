# EvolveXI

Player assessment and development tracking for grassroots football coaches. Coaches rate players across five pillars (Technical, Physical, Tactical, Psychological, Social) using a fixed, age-calibrated question bank, then get an AI-written development report per player.

See `/docs` for the full product spec (PRD, workflow, and prototype build brief) and the master question bank source data.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres, Auth, Row Level Security)
- Claude (Haiku 4.5) for report generation

## Running locally

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase and Anthropic API keys before starting the server.

Database schema changes live as numbered SQL files in `/supabase/migrations`, applied in order via the Supabase SQL Editor.
