# Portfolio experience update — design (small change)

Date: 2026-11-17

## Intent

The portfolio still presents Hillman as a junior engineer with "some client
experience". Since October 2025 he has delivered 5+ client projects with a
combined received value of over HK$500,000, and JARVIS AI Limited has moved
through several programme stages. The site should say so, briefly, so a
recruiter or prospective client sees real delivery experience.

## Goals

- Short experience summary (5+ client projects, HK$500k+ combined value) on the
  homepage intro and the About intro.
- One new Experience entry describing the kinds of client projects delivered and
  the problems they solved.
- JARVIS AI Limited entry rewritten as dated stages, with facts that match the
  programme emails.
- Drop "Junior" from the headline, page title and search metadata.

## Non-goals / anti-goals

- No client names, no "NDA" labels, no demo links, no links to client sites or
  client details.
- No per-client amounts (one client agreement forbids publishing commercial
  figures). Only the combined HK$500k+ total appears.
- No new sections, layouts or project cards (Option 1: rewrite in place).
- Small side jobs are not mentioned.

## Approaches considered

1. **Rewrite in place (chosen).** Update existing copy and add one Experience
   entry. Smallest change; no new UI.
2. Rewrite + a "Client Work" block on About with stats and client cards.
   Rejected: names and links to clients are not wanted.
3. A project card per client. Rejected: confidential work would produce thin
   pages with no screenshots.

## Content decisions

- Client entry: "Freelance Software Engineer — Client Projects", Oct 2025 –
  Present. Bullets by project type: fintech treasury/FX platform, salon booking
  and operations system, staged mobile web app (PWA), e-commerce stores, and
  pre-launch security reviews.
- JARVIS stages: selected for AWS Startup Launcher × HKSTP Co-Ideation (Cohort
  AWS26-04) → Silver milestone passed, first grant June 2026 → company
  incorporated September 2026 → Gold milestone submitted October 2026 (4 signed
  LOIs, 7 pilot seats), under review → next: HKSTP Incubation (Platinum) before
  May 2027.
- AWS Activate: the "US$25,000 in credits" claim could not be verified, so it
  is replaced with "eligible for AWS Activate credits", no figure.
- Headline: "Software Engineer — AI & Full-Stack Development".

## Files touched

- `portfolio/src/MainContent.js` — hero heading, intro, image alt.
- `portfolio/src/components/AboutMe.js` — intro, new experience entry, JARVIS entry.
- `portfolio/src/projectData.json` — JARVIS (id 17) full description.
- `portfolio/src/Layout.js` — footer blurb.
- `portfolio/src/components/Seo.js`, `portfolio/public/index.html` — title and descriptions.
- `portfolio/src/components/Seo.test.js` — expectations follow the new title.

## Verification

- `npm test` (CI=true) passes, `npm run build` passes.
- Homepage and /about checked in a browser at desktop and phone width, no
  console errors.
