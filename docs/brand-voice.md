# Nodus — Brand Voice & Copy Guide

The single reference for *how Nodus speaks*. Every user-facing string — landing, app,
explorer, meta tags, node labels, and machine-generated translations — should pass the
checklist at the bottom. This guide governs **words and tone**, not typography: casing,
fonts, and color are owned by the design system shipped in the chrome redesign (`91c1a0e`).
When in doubt about UPPERCASE vs sentence case, follow the existing component, not this doc.

---

## Who we're talking to

**Curious explorers, around 12 and up.** No prior knowledge of any topic is assumed.
Pitch every line at a sharp ~12-year-old: plain, but never *simplistic*. Don't dumb it
down — over-simple copy reads as condescending and drains the wonder. If a sentence
would lose a curious 12-year-old *as a sentence* (even when the *idea* is hard), it's too
complicated; if it sounds like a picture book, it's too simple. Aim between.

## Voice in one line

> A wonder-struck guide standing next to you at the telescope — pointing, not lecturing.

## Three pillars

1. **Invite, don't instruct.** Speak to "you." Prefer invitations ("Begin anywhere")
   over commands or feature-talk. Lower every barrier to the next click.
2. **Wonder, grounded.** Lean into the Deep Field / starfield imagery — but every
   metaphor must *earn its place by making the meaning clearer*, never decorate.
3. **Plain words, big ideas.** Small words, large concepts. No undefined jargon. If a
   technical term is unavoidable, define it inline in the same breath.

## How it should feel

Curious · warm · calm · confident · spacious.

**Not:** salesy, hyped, gamified, corporate, academic, institutional, or cutesy.

---

## Bold where it sings, crisp where it works

Lean **bold and poetic** on *expressive* surfaces — the hero, taglines, welcome and
empty states, onboarding, the panel's framing. Stay **crisp and literal** on
*operational* surfaces — button labels, tooltips, menu items, `aria-label`s, errors,
and anything the user reads mid-action. A vague tagline sings; a vague button hurts.
When the two collide, usability wins.

## The Deep Field metaphor

Nodus is a *survey of the deep field of knowledge*. Use it as the spine of the voice:

- Concepts are **points / stars** scattered across a **field**; the user is the observer
  charting them.
- Reach for: *field, point, star, chart, trace, survey, follow, pull in, sightline,
  foundation, frontier, depth, expanse.*
- "First light" (a telescope's first image) = a first visit. A **frontier** = an idea
  nothing builds on yet. A **foundation** = an idea nothing comes before.
- Keep it **literal in operational copy**: in tooltips, `aria-label`s, and menus a node
  is a "node," not a "star." Save the metaphor for prose the user reads at rest.

---

## The Nodus word-world

**Reach for:** explore, discover, connect / connection, path, field, constellation,
spark, curiosity, wander, begin, anywhere, infinite, map, trace, follow, unfold, reveal.

**Signature phrases** (keep and evolve, don't discard — these are brand equity):
"Deep Field Survey", "It's all connected", "Begin anywhere", "Explore the infinite",
"one spark of curiosity."

**Avoid:**
- *Corporate:* leverage, utilize, robust, seamless, powerful, cutting-edge,
  revolutionize, AI-powered, solution, platform.
- *Gamification:* level up, points, XP, streak, badge, achievement, reward, "unlock"
  *as a prize*. (See the note on existing terms below.)
- *Institutional / school:* course, lesson, curriculum, quiz, enroll, master.
  Nodus is not a course — it's a place to wander.
- *Hype punctuation:* exclamation marks (calm wonder, not excitement) and emoji.

**Existing domain terms — keep, but frame carefully:**
- **Learning Path** — fine. It's a *path through the graph*, not a school course.
- **Prerequisites / Unlocks** — these describe *knowledge structure* (what an idea
  builds on, what it opens up next), not game rewards. Keep the framing factual:
  "what this builds on" / "what this leads to," never "earn" or "win."

---

## Rules

- Use **"you"** and the imperative-as-invitation. ✅ "Search a concept to start exploring."
- **One idea per line.** Short sentences. Cut every word that isn't working.
- **Define or drop jargon.** If a curious newcomer wouldn't know the word, explain it
  in the same sentence or pick a plainer one.
- **No exclamation marks, no emoji.** Wonder is conveyed by imagery and rhythm.
- **Numbers read as instrument data**, not marketing: `627 nodes · N edges · 13 domains`.
- **Errors are calm and never blame the user.** State what happened, offer the next step.
  ✅ "Couldn't load the graph. Retry?"  ❌ "Error: failed to fetch."
- **Tooltips are action-first and terse.** ✅ "Fit view to all visible nodes."
- **Don't reference motion** in copy when `prefers-reduced-motion` users won't see it.

---

## Microcopy patterns

| Surface | Pattern | Example |
|---|---|---|
| Hero kicker | 2–3 words, an opening gesture | "Begin anywhere" |
| Hero line | A short claim or invitation | "It's all connected" |
| Subtitle | One warm sentence, the promise | "Follow one spark of curiosity wherever it leads." |
| Primary CTA | Verb + object, no fluff | "Start exploring" |
| Search placeholder | Invitation, not instruction | "Explore the infinite…" / "Search a concept to start exploring…" |
| Empty / welcome | What to do, gently | "Search a concept to start exploring." |
| Onboarding step | One action per step, "you" voice | "Click any node to open it and re-center the map." |
| Tooltip | Terse, action-first | "Undo the last expand" |
| Error | Calm + next step | "Couldn't load the graph. Retry?" |

---

## Node-label naming conventions (for the data corpus)

Labels are the short display names in `data/all_nodes.json` (`label` field). The English
label is canonical; zh/ja are regenerated from it.

- **Use the most widely recognized name**, not the most technical.
  ✅ "Black Holes"  ❌ "Gravitational Singularities."
- **Title Case** for fields, concepts, and events (capitalize principal words).
  Proper names for people, as conventionally written.
- **Keep it short** — 1–4 words. The display label never includes the type word
  ("field", "concept"); that lives only in the node `id`.
- **Singular concepts, conventional discipline forms.** "Mathematics" and "Economics"
  keep their standard form; concepts are singular unless inherently plural
  ("Maxwell's Equations").
- **Disambiguate sparingly.** Only add a qualifier when two labels would genuinely
  collide; prefer the common name otherwise.

---

## Three languages

English is canonical. Chinese and Japanese are *localizations*, not literal translations
— match the warmth and simplicity, never produce translationese.

- **zh** → Traditional Chinese (zh-TW), using Taiwan academic-standard terminology
  (教育部 / 學界慣用譯名).
- **ja** → standard Japanese; loanwords in katakana; established academic terms where
  they exist.
- **Brand words stay constant:** "Nodus" and the "Deep Field Survey" wordmark remain in
  English in every locale (it reads as the name of the instrument / survey program).
  The *human* taglines and UI strings are fully localized.
- **People's names** use the established local rendering / transliteration standard.

**Living glossary** (extend as terms recur — keeps labels and translations consistent):

| EN | zh-TW | ja |
|---|---|---|
| Network | 網路 | ネットワーク |
| Field (discipline) | 領域 | 分野 |
| Path | 路徑 | パス／経路 |
| Connection | 連結 | つながり |
| Node | 節點 | ノード |

---

## Checklist — run this on every string

- [ ] Would a curious 8-year-old understand the **sentence** (even if the idea is hard)?
- [ ] Does it **invite** rather than instruct or sell?
- [ ] Any corporate / gamified / school words to cut?
- [ ] Any jargon left undefined?
- [ ] Does every metaphor **earn its place** by adding clarity?
- [ ] Consistent with the word-world and the glossary above?
- [ ] Casing/typography left to the design system (not re-cased here)?
