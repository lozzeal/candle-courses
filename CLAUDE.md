# Candle Courses — landing page (handoff for next AI helper)

You are continuing work on a finished landing page. Read this whole file before making any change.

## What this product is

Online course bundle for crafting candles, aroma products, and decorative items (gypsum, concrete). Five separate courses, all delivered as pre-recorded video lessons via Telegram. Target audience: hobbyists and people starting a small craft business. Language: Ukrainian.

The page sells access to one or several of those courses with a one-time payment. There is no subscription, no live cohort.

## Project state

- **Live URL:** https://candle-courses.vercel.app (production)
- **Stack:** single static `index.html` + `assets/` folder. No JavaScript. No framework. No build step.
- **Fonts:** Google Fonts (Cormorant Garamond + Inter), loaded via `<link>`.
- **Status:** designer-reviewed, copywriter-reviewed (formal "ви", course cards rewritten, real review screenshots added). Deployed and approved by the client. Treat this as the **baseline** — your job is incremental edits, not a redesign.

## File map

```
candle-courses/
├── index.html        ← 72 KB, all CSS inline in <style>, all images via <img src="assets/…">
├── assets/           ← 30 files: hero photos, course covers, review screenshots, petals
├── README.md         ← human-readable design-system reference
├── CHANGELOG.md      ← what the previous designer changed (read this for tone of edits)
└── CLAUDE.md         ← this file
```

## Hard rules — do not change without explicit request

1. **Do not redesign sections.** All 10 sections (hero → audience → benefits → howto → author → courses → results → gives → student-works → reviews → faq) are signed off. If asked to "improve" a section, ask the user first which exact element.
2. **Do not change the colour palette or fonts.** They are in `:root` CSS variables at the top of the `<style>` block. README.md lists them.
3. **Do not change formal address ("ви").** All copy uses formal "ви". The previous pass converted everything from informal "ти". Do not regress.
4. **Do not touch mobile hero unless asked.** The mobile hero (inside `@media (max-width: 768px)` for `.hero`) uses `assets/hero-mobile.png` as a background and absolutely-positioned text layers (`.hero__title`, `.hero__info`, `.hero__cta`, `.hero__note`). Coordinates were dialed in pixel-perfect against that background image. If the user asks you to "fix" it because text is off — first check whether the background file is loading; do not rebuild it as a flex column.
5. **Do not remove `assets/` files** even if a file looks unused (e.g. `author-photo-98cf0ef1.png` is the old author photo, kept for rollback). Only the user removes assets.
6. **No emoji icons in markup.** All icons are inline SVG. README.md spells this out.
7. **No JavaScript.** FAQ is `<details>/<summary>`. Course-card "show more" was deliberately removed in favour of fully-visible lists.
8. **No external CSS or JS files.** Everything stays inline in `index.html` so the file remains drop-in.

## Design system (recap — full table in README.md)

```css
:root {
  --color-text:       #262626;
  --color-accent:     #38A30D;          /* green CTAs, numbers, dots */
  --gradient-cta:     linear-gradient(#49C318, #38A30D);
  --gradient-soft:    linear-gradient(#FFFCFC, #FFF0F0);  /* light pink panels */
  --gradient-pink:    linear-gradient(#FFE5E0, #FFD9D2);  /* darker pink panels */
  --color-bg:         #A69D97;          /* grey background blocks */
  --color-author-border: #F5D9D0;
}
```

Typography: **Cormorant Garamond** uppercase 600 for headings, **Inter** for body. Section pattern: alternating light-pink ↔ grey backgrounds, each section roughly one viewport tall on desktop, full vertical stack on mobile.

## How to edit safely

- Open `index.html` in any web editor (CodeSandbox, StackBlitz, VS Code, Webflow custom code). Live preview by double-clicking the file.
- For CSS changes, find the section's class (`.hero`, `.audience`, `.benefits`, `.howto`, `.author`, `.courses`, `.results`, `.gives`, `.student-works`, `.reviews`, `.faq`) and the matching `@media (max-width: 768px)` block below it.
- For copy changes, work in the HTML at the bottom of the file. Preserve the formal "ви" register.
- For new images: drop the file in `assets/`, reference it as `<img src="assets/your-name.jpg" alt="…">`. Do not base64-encode (the file used to be 2.4 MB single-file; the previous AI extracted everything to make it editable — keep it that way).

## Deploy

The user owns deployment. Do not deploy from this folder. Hand the edited `candle-courses/` folder back to the user — they will deploy via Vercel (project `candle-courses`, alias `candle-courses.vercel.app`).

If asked to "deploy", confirm with the user first; ask them to provide a fresh Vercel token rather than reusing one you find.

## What the previous AI helper did (latest pass, May 2026)

1. Extracted 11 base64 images from the original 2.4 MB single-file HTML into `assets/` (≈75 KB readable HTML now).
2. Designer applied: formal "ви", rewritten course cards, new "Роботи учнів" section, replaced fake reviews with 13 real screenshots (`assets/review-01.jpg` … `review-13.jpg`), new author photo (`assets/author-photo-new.jpg`).
3. Restored mobile hero to the pixel-positioned version on top of `assets/hero-mobile.png` (the designer had replaced it with a CSS-gradient flex stack because the image wasn't in her drop).

CHANGELOG.md has the designer's own notes per section. Read it before touching course cards or FAQ.

## Open follow-ups

- "Роботи учнів" section currently uses placeholder photos pulled from course covers. The user will deliver real student-work photos eventually — replace those `<img src="assets/course-…jpg">` inside `.student-works` only when the user provides files.
- Old author photo (`assets/author-photo-98cf0ef1.png`) is unused but kept for rollback. Do not delete unless the user asks.

## Communication

Reply in Ukrainian. The end user (client) is non-technical; explain changes in plain language without jargon. Show, don't tell — when uncertain, propose a small, reversible diff and ask before applying broader edits.
