# NextXI — Prototype Build Brief (v1)

**Purpose:** free, field-testable prototype for Jamie to trial himself and with grassroots coaches, before committing to the full build and its associated costs (PDF export, payments, polish).

**Companion documents:** NextXI PRD v2.1, NextXI Workflow v2.1, NextXI Question Bank DRAFT 2. This brief does not replace them — it defines a *trimmed scope* for the first working version. Full feature detail (schema fields, screen copy, question bank structure) lives in those documents; hand Claude Code all four files as project context.

---

## 1. What this prototype is for

Validate the core coach workflow — team setup, squad, running an assessment session, and the AI-written report — with real grassroots coaches, at effectively zero infrastructure cost. Not a launch candidate. No payments, no export pipeline, no marketing polish.

## 2. In scope: Phases 1–7

Build and test each phase before moving to the next, per the Workflow doc's own build-order instruction.

| Phase | What to build | Prototype notes |
|---|---|---|
| 1 — Foundation | Supabase project, auth (register/login/reset), navigation shell, env vars | As per Workflow doc |
| 2 — Onboarding & question bank | Seed the master question bank (216 questions, positional variants from U10–U11 up); team setup form; question preview/edit/add-custom screen | Seed directly from Question Bank DRAFT 2 |
| 3 — Squad | Add/edit/archive players, squad list, player profile (empty) | As per Workflow doc |
| 4 — Session creation | Session details, pillar selection, player selection | As per Workflow doc |
| 5 — Assessment form | 1–5 rating controls, anchor descriptor display, auto-save, pillar notes, standout moment; position-matched Technical/Tactical questions from U10–U11 up | As per Workflow doc |
| 6 — Report generation | Claude Haiku 4.5 API call, report displayed on screen, inline editing, save to DB | **Display on screen only — no PDF, no email (see exclusions)** |
| 7 — Session complete & dashboard | Session complete screen, squad dashboard with colour coding, radar chart | As per Workflow doc |

## 3. Explicitly excluded from the prototype

- **Phase 8 — Export.** No PDF generation, no Resend email integration. Coaches view/screenshot reports on screen during testing.
- **Phase 9 — Progress tracking.** Longitudinal charts and progress reports deferred. Not needed to validate the core assessment loop.
- **Phase 10 — Payments.** No Stripe, no plan gating, no free-tier limits enforced. Every test coach gets full access.
- **Phase 11 — Polish & launch.** No landing page, no marketing copy, minimal error/empty states — just enough to not block testing.

These are deferred, not cut — they return for the full build once the prototype validates the core loop.

## 4. Account & environment setup (all free)

1. **GitHub** — new repo for the project
2. **Vercel** — sign in with GitHub, Hobby (free) tier. *Note: Hobby tier is licensed for personal/non-commercial use — verify current Vercel terms before relying on it beyond closed field testing.*
3. **Supabase** — new project, Free tier (500MB DB, 50k MAU — comfortably enough for a prototype)
4. **Anthropic Console** — API key for Claude Haiku 4.5, billing card on file (spend during testing is expected to be low — verify actual cost against the Anthropic console rather than estimating)
5. **Node.js + Claude Code CLI** installed locally, pointed at the new repo

Skip Resend/Stripe accounts entirely for this phase.

## 5. Handoff to Claude Code

Place this brief alongside the PRD v2.1, Workflow v2.1, and Question Bank DRAFT 2 in a `/docs` folder in the repo. Start each build session by pointing Claude Code at Phase 1, working sequentially, testing each phase before starting the next.

## 6. Exit criteria for the prototype phase

Ready to move to full build (Phases 8–11) once:

- Team setup, squad management, and session creation work reliably end to end
- Coaches (Jamie + test group) can complete a full assessment session pitchside without data loss
- AI-generated reports are consistently useful and accurate enough to share with a parent
- Direct feedback gathered from test coaches on question wording, anchor clarity, and report tone

---
*NextXI — prototype scope working document. Supersedes no prior version; complements PRD v2.1 / Workflow v2.1.*
