# Gym English language and mobile update

The header now offers Cantonese and UK English. The saved language preference uses `hillman-gym:locale`, independently of workout records and backup schemas. The full interface, dates, 29 exercise guides, three programmes, glossary, offline messages, accessibility labels, installation metadata and media credits have English versions. Both languages are packaged for offline use. Original exercise identifiers, media and workout records are preserved.

Phone layouts now use four visible navigation tabs, larger controls, 16px form inputs, a single-column exercise library, larger previews, full-screen demo/settings dialogs with persistent close controls, and calendars that fit narrow screens. Desktop and tablet layouts retain the existing visual design.

## Verification

- All 55 Node checks passed, including 19 translation and locale checks.
- Normal CRA production build passed; only the existing Browserslist database-age notice remains.
- Browser checked 320, 375, 390, 430 and 768px layouts without horizontal overflow. Narrow calendar targets do not overlap; workout numeric inputs are 16px and 46px high, with 44px completion controls.
- English library, guide, workout and demo content have no untranslated Chinese text (the language chooser retains each language's own name).
- A test weight of 22.5kg, 12 reps, a completed set and a note survived Cantonese/English switching and a page reload. The English preference also survived reload.
- With the isolated preview server stopped, the app reopened, switched between both languages, retained the test record and played a cached exercise video.
- Offline release: `9b548e637f10255559ef`, 99 cached assets.

Deployment uses the existing gym-scoped AWS/Cloudflare script. It now checks every gym test and uploads both language manifests. No workout-data migration is needed.
