# Project Rules & Critical Safety Guidelines

## Critical Rules to Prevent Regressions and White Screens
1. **Mandatory Type & Reference Checking**:
   - Always run `npm run lint` (`tsc --noEmit`) before committing, pushing, or deploying.
   - Vite builds can bundle code with undeclared variables if not caught by type checking. Running `npm run lint` prevents runtime exceptions like `ReferenceError: users is not defined`.
2. **Context Hook Destructuring**:
   - Always ensure hooks like `useAuth()` are explicitly called and destructured inside the component before using `users`, `currentUser`, etc.
3. **Live Smoke Testing**:
   - Always verify the deployed site on both Vercel (`https://utt-guidance-system.vercel.app/`) and Firebase Hosting (`https://gen-lang-client-0938203450.web.app/`) to confirm no white screens or console errors occur.
