# AGENTS.md — Working Rules for AI Coding Agents

## Read first

Before coding, read:
1. `PROJECT_CONTEXT.md`
2. `docs/01-product-vision.md`
3. `docs/02-game-design-bible.md`
4. `docs/03-mvp-scope.md`
5. `docs/04-ai-and-google-integrations.md`
6. `docs/05-content-and-curriculum.md`
7. `docs/06-roadmap.md`

## Product rules

- Player-facing language: Vietnamese.
- Do not introduce English UI text unless it is an internal/dev label.
- Do not turn gameplay into repeated multiple-choice quizzes.
- Prefer short, satisfying, touch-friendly interactions.
- Learning objectives must be explicit in data/config even if invisible to the child.
- Reward mastery, accuracy, strategy, exploration and improvement — not endless playtime.
- Avoid dark patterns, loot-box monetization, pay-to-win and manipulative streak pressure.
- Keep the MVP focused on Grade 1 vertical slice.
- Any curriculum claim must be traceable to an official source before production use.

## Engineering rules

- Keep content/data separate from presentation when possible.
- Design the level system as data-driven so new grades/subjects can be added without rewriting the engine.
- AI calls must have graceful fallback behavior.
- Never expose API keys client-side.
- Treat child data as sensitive.
- Add instrumentation for learning outcomes and gameplay outcomes separately.
- Prefer small, reviewable PRs.

## Collaboration

When a requirement is ambiguous:
- Preserve the current product principles.
- Document assumptions in `docs/DECISIONS.md`.
- Prefer reversible architecture.
- Do not silently widen scope.
