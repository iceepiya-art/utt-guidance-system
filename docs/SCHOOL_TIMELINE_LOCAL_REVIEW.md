# School Timeline navigation — local review

This change supersedes the Activity History UI from the prior School Hub requirement.

- Removed the lower Activity History section. No source records or photos were deleted.
- Timeline steps 2, 3 and 4 are the entry points for submissions, appointments and actual field trips respectively.
- One matching source opens directly. Multiple sources open a compact collapsible selector containing every safely related record, newest first.
- Existing source detail modals and image URLs are reused. Keyboard Enter/Space and close/focus return are supported.
- Completed appointments remain appointments, even when they contain photos. They do not create guidance results or mark the school as guided without a FieldTrip. Stored completion flags alone likewise do not prove guidance.
- The shared guidance list and submission workflow display follow this source rule; Monthly Report continues to use only real submission/field-trip records.
- Exact school document IDs and exact unique legacy codes remain the school relation. No fuzzy name matching or production relation changes.
- Bottom actions retain school editing, a new letter cycle and appropriate appointment/result navigation.

Validation: `npm run lint`, `npm test` (378 Vitest + 8 Functions tests), `npm run build`; local browser QA at 1366×768, 1920×1080 and 390×844. `tests/browser/school-timeline-qa.cjs` verifies removal, single/multiple source selection, original photos, legacy exclusion, keyboard/focus, and Monthly Report source parity. Screenshots: `qa-school-hub/timeline-1366.png`, `timeline-1920.png`, `timeline-mobile.png`.

QA uses isolated fixtures with external requests blocked; no live data writes or uploads are performed. Existing legacy appointment photos remain accessible in step 3. No migration is used to manufacture FieldTrips for those records.

PRODUCTION FIRESTORE WRITES = 0
PRODUCTION STORAGE WRITES = 0
AUTH CHANGES = 0
MIGRATION = 0
DELETE RECORDS = 0
DELETE PHOTOS = 0
COMMIT = 0
PUSH = 0
DEPLOYMENT = 0

## Follow-up: guidance evidence belongs to step 4

Appointment detail no longer renders the combined photo gallery, photo lightbox, or completed legacy appointment notes as guidance results. Stored appointment photos and notes are untouched. Non-completed appointment scheduling notes remain visible. Appointment vehicle and responsible-person text now come only from the appointment's stored values, without a linked-letter vehicle fallback.

Step 4 remains sourced exclusively from actual related FieldTrips. Single/multiple source navigation, original FieldTrip photos, and Monthly Report parity were verified at all three viewport sizes. Tests explicitly check that completed appointments with no FieldTrip leave step 4 empty and cannot generate a Monthly Report work row. Browser QA checks that Appointment Detail contains no guidance images or result text.

Validation: 381 Vitest tests and 8 Functions tests pass. All mutation counters above remain zero. No legacy migration or synthetic FieldTrip creation.
