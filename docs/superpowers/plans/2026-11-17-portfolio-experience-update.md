# Portfolio Experience Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show 5+ client projects (HK$500k+ combined), the JARVIS AI Limited stages, and drop "Junior" across the portfolio.

**Architecture:** Content-only change. Career copy lives in `portfolio/src/data/career.js` (shared by About and the 3D room); project copy in `projectData.json`; headline and SEO copy in `MainContent.js`, `AboutMe.js`, `Layout.js`, `Seo.js`, `public/index.html`, `room/PortfolioContent.js`.

**Tech Stack:** React 18 (CRA), Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-portfolio-experience-update-design.md`

## Global Constraints

- No client names, no "NDA" wording, no links in the client entry.
- Only the combined figure "HK$500,000" / "HK$500k+" and "5+ client projects" appear; no per-client amounts.
- No "US$25,000" AWS Activate claim anywhere.
- No "junior" in headline, SEO title or descriptions.

## Review Focus

- The 3D room's Experience screen renders `career.js` with `key={role.company}`: the new entry's company must be unique.
- Search snippets come from both `Seo.js` (runtime) and `public/index.html` (first paint, crawlers): both must change together.
- Phone width: the long new bullets must wrap inside the experience card (no horizontal scroll).

---

### Task 1: Career and project copy

**Files:**
- Modify: `portfolio/src/data/career.js` (JARVIS entry; new "Freelance Software Engineer" / "Client Projects" entry after Evoke)
- Modify: `portfolio/src/projectData.json` (id 17 `fullDescription`)
- Test: `portfolio/src/data/career.test.js`

- [ ] Write `career.test.js`: client entry exists (title "Freelance Software Engineer", company "Client Projects", start "October 2025"), its text contains "HK$500,000" and "5+", and contains no "NDA" label and no URL or domain; companies are unique; no entry and no project 17 text contains "US$25,000"; JARVIS entry mentions "Gold" and "Incubation".
- [ ] Run it, expect FAIL.
- [ ] Edit the copy to the approved wording.
- [ ] Run it, expect PASS.

### Task 2: Headline and SEO

**Files:**
- Modify: `MainContent.js`, `components/AboutMe.js`, `Layout.js`, `components/Seo.js`, `public/index.html`, `room/PortfolioContent.js`
- Test: `components/Seo.test.js`

- [ ] Update `Seo.test.js`: home title `'Hillman Chan | Software Engineer'`; description contains `'HK$500,000'`; restored-metadata test expects `'software engineer specialising in AI'`; new test reads `public/index.html` and asserts no `/junior/i`.
- [ ] Run, expect FAIL.
- [ ] Edit copy.
- [ ] Run full suite (`CI=true npx react-scripts test --watchAll=false --testPathIgnorePatterns=/game/`), expect all pass; `CI=true npx react-scripts build` passes.

### Task 3: Verify, ship

- [ ] Browser check `/`, `/about`, `/room` Experience screen at desktop and 390px width; no console errors.
- [ ] Commit on `feat/portfolio-experience-update`, push, `gh pr create`, `gh pr merge --merge`, watch the deploy workflow, check hillmanchan.com live.
