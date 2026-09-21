# Deployment and Runtime Safety Rules

## 1. Zero Undefined Reference Errors (Strict Linting Before Deploy)
- **Always run `npm run lint` (`tsc --noEmit`)** before committing or pushing changes to `main` or deploying to Firebase Hosting.
- When referencing context variables such as `users`, `currentUser`, `isAdmin`, etc., always ensure that `useAuth()` (or the relevant context hook) is explicitly destructured at the top of the component.
- Never assume global or parent-scope availability of context state.

## 2. Production Smoke Testing Verification
- After every deployment to Vercel or Firebase Hosting:
  1. Always verify the live URLs (`https://utt-guidance-system.vercel.app/` and `https://gen-lang-client-0938203450.web.app/`).
  2. Ensure the page does not render a blank white screen.
  3. Confirm that no uncaught runtime errors appear in the browser console.
