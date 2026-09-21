# Production release — 13 September 2026

- Live URL: https://utt-guidance-system.vercel.app/
- Commit: 0ed68e1 (enterprise release plus numeric year report fix)
- Vercel production deployment: success
- Existing Firebase project and named database retained; no school/activity records deleted or seeded.
- Email/password Authentication enabled; real administrator account provisioned for the signed-in project owner.
- Initial credentials stored only in local ignored .env.initial-admin, not committed.
- Firestore rules deployed to ai-studio-8fc73ebf-4b79-4218-9abe-c0c98ecdd272.
- Live administrator sign-in and Firestore queries: passed.
- Unauthenticated school query: denied (403).
- Browser: login, dashboard (12 existing schools), main navigation, monthly reports, settings, logout passed without JavaScript errors after fixing the report year conversion.
- Automated checks: TypeScript, build, unit tests, and Firestore Emulator authorization tests.

Remaining limitations: email delivery is not configured; Storage upload/rules and real business CRUD workflows have not been fully tested; dependency audit findings remain as documented in VALIDATION.md. Existing five demo profiles are preserved and are not real Authentication accounts. Staff need actual Authentication accounts and matching UID profiles before login.
