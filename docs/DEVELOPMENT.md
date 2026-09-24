# Developing Workout Journal

## Run it

```bash
bun install
bun run dev        # http://localhost:5173 (also on your LAN, so you can open it on a phone)
bun run build      # type-check + production build into dist/
bun run preview    # serve dist/ locally (service worker enabled)
```

`npm` works too.

Without Firebase env vars the app runs in **device-only mode**: "Continue without an account" stores everything in the browser's localStorage, and the Google button is shown but disabled.

## How it's built

| | |
|---|---|
| App | Vite + React 19 + TypeScript, React Router, plain CSS (tokens in `src/styles/base.css`) |
| Data | `src/data/backend.ts` interface with two implementations: `localBackend.ts` (device) and `firebase.ts` (Firestore, per user). Screens only use `src/data/store.ts`. |
| Sign-in | Firebase Auth with Google, loaded lazily only when configured (`src/auth/AuthProvider.tsx`) |
| Offline | `sw.template.js` → `dist/sw.js` at build time precaches the app shell and icons. Firestore's persistent cache queues writes made without signal. |
| Icons | 3D icons from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT, see `public/icons/fluent/LICENSE.txt`). Users can also type any emoji. |

Data model (`src/lib/types.ts`):
- **Exercise**: a shared library entry ("Squat") with how it's measured: `weight`, `reps` (bodyweight counts) or `time` (holds, cardio).
- **SessionType**: name, icon, sets and reps (shared by all its exercises), and a list of planned exercises. Each planned value (weight, time, or rep count) is optional; an empty one is taken from last time.
- **Workout**: the session's reps, a done flag per set (a set being one round through all the exercises), and the exercises with their values. Names are copied so history survives renames and deletions.

Weights are always stored in kg and converted for display. Older documents (first version: one weight per session and a list of sets; then per-exercise checked sets) are upgraded when read (`upgradeSets` in `normalizeData`), so nothing needs migrating by hand.

## Google sign-in (Firebase)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (the free Spark plan is plenty).
2. **Build → Authentication → Sign-in method**: enable **Google**.
3. **Build → Firestore Database**: create a database (production mode, pick a region close to you). Paste `firestore.rules` into the Rules tab (or `firebase deploy --only firestore:rules`). Each user can only read and write `users/{their uid}/…`.
4. **Project settings → Your apps → Web app**: register the app and copy the config values into `.env.local` (see `.env.example`), and into the Vercel project's environment variables as **Config** (not Secret) variables, since they're meant for the browser:
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_PROJECT_ID=…
   VITE_FIREBASE_APP_ID=…
   ```
5. **Authentication → Settings → Authorized domains**: add the production domain.
6. **Google Cloud Console → APIs & Services → Credentials → Web client (auto created by Google Service)**: add `https://<domain>/__/auth/handler` (and `http://localhost:5173/__/auth/handler` for dev) to the authorized redirect URIs.

Sign-in uses a popup and falls back to a full-page redirect where popups are blocked (installed app, some mobile browsers). To keep that redirect first-party (Chrome and Safari partition third-party storage, and the Android wrapper needs it), Firebase's sign-in handler is served from our own domain: `authDomain` is the current host, `vercel.json` rewrites `/__/auth/*` and `/__/firebase/*` to `<project-id>.firebaseapp.com`, and `vite.config.ts` proxies the same paths in dev.

Current project: `workout-journal-dd95f` (Firestore in `europe-west1`), live at https://workout-journal-three.vercel.app.

After someone signs in, workouts they logged before (in device-only mode) are offered for import with a banner on the Journal.

## Deploying (Vercel)

`vercel.json` handles SPA routing and cache headers (hashed assets are immutable, `sw.js` is never cached). In Vercel: **Add New → Project → import the GitHub repo**. The Vite preset is detected; the build runs `bun run build` and publishes `dist/`. Every push to `main` deploys; branches get preview URLs (add those domains to Firebase's authorized domains to sign in on previews).

## Android

The web app is a complete PWA: manifest (`public/manifest.webmanifest`) with `any` and `maskable` icons, standalone display, portrait orientation, theme colors, a "Log a workout" shortcut, and a service worker for offline use.

The recommended wrapper is a **Trusted Web Activity** (Chrome running the deployed site full screen):
- Google sign-in, offline cache and updates work exactly as on the web: deploy the site and the app updates.
- Generate it with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap): `npx @bubblewrap/cli init --manifest https://<domain>/manifest.webmanifest`, then `bubblewrap build`.
- Prove we own the site: copy `android/assetlinks.template.json` to `public/.well-known/assetlinks.json` with the package name and the SHA-256 of the signing key (Play Console → App integrity), then redeploy.

A Capacitor wrapper (bundling the web build inside the app) is possible too. Google blocks its sign-in page inside embedded WebViews, though, so it would need a native sign-in plugin (e.g. `@capacitor-firebase/authentication`). It's only worth it for native features such as a home-screen widget.

## Screenshots

The images in `docs/screenshots` are generated from demo data (9 weeks of training) by `scripts/screenshots/run.sh`. It drives the system WebKit at phone size, so it runs on macOS only. Start the dev server first (`bun run dev`), then:

```bash
sh scripts/screenshots/run.sh
```

`plan.mjs` holds the demo data and the list of screens; `hero.html` lays out the header image.

## Design

White background, near-black text and pill buttons, a serif display face (Newsreader) over Inter, and soft grainy pastel gradients ("auras") as set pieces at the top of each screen: dawn (Journal), lilac (logging), sunset (the active workout, which warms up as sets get checked), mint (Setup). Desktop is the same single column, centered.
