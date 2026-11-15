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
5. **Authentication → Settings → Authorized domains**: add the production domain (and any custom domain).
6. **Google Cloud Console → Google Auth Platform → Clients → Web client (auto created by Google Service)**: for every domain the app is served from, add `https://<domain>` to the authorized JavaScript origins and `https://<domain>/__/auth/handler` to the authorized redirect URIs (plus `http://localhost:5173` and its handler for dev). A missing redirect URI shows up as `redirect_uri_mismatch` when signing in; the Branding page's authorized domains are a separate list.

Sign-in uses a popup and falls back to a full-page redirect where popups are blocked (installed app, some mobile browsers). To keep that redirect first-party (Chrome and Safari partition third-party storage, and the Android wrapper needs it), Firebase's sign-in handler is served from our own domain: `authDomain` is the current host, `vercel.json` rewrites `/__/auth/*` and `/__/firebase/*` to `<project-id>.firebaseapp.com`, and `vite.config.ts` proxies the same paths in dev.

Current project: `workout-journal-dd95f` (Firestore in `europe-west1`), live at https://workout.app.roberrini.com (also https://workout-journal-three.vercel.app).

After someone signs in, workouts they logged before (in device-only mode) are offered for import with a banner on the Journal.

## Deploying (Vercel)

`vercel.json` handles SPA routing and cache headers (hashed assets are immutable, `sw.js` is never cached). In Vercel: **Add New → Project → import the GitHub repo**. The Vite preset is detected; the build runs `bun run build` and publishes `dist/`. Every push to `main` deploys; branches get preview URLs (add those domains to Firebase's authorized domains to sign in on previews).

## Android app

`android/` is the Android app: a **Trusted Web Activity**, a small native shell (`com.roberrini.workout`) that opens https://workout.app.roberrini.com full screen in Chrome. The app and the website are the same thing: same UI, same Google sign-in and Firestore data, and every web deploy updates the app. There's no app code, only `AndroidManifest.xml` (built on Google's [android-browser-helper](https://github.com/GoogleChrome/android-browser-helper) `LauncherActivity`), the icon, and a "Log a workout" shortcut.

Build with the same toolchain as Sundial (Android Studio's bundled JDK, AGP 9.2, Gradle 9.7):

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleRelease   # APK to install directly: app/build/outputs/apk/release/
./gradlew bundleRelease     # AAB for Google Play: app/build/outputs/bundle/release/
```

**Signing.** Release builds are signed with `android/keystore/workout-release.jks`; its passwords are in `android/keystore.properties` (format in `keystore.properties.example`). Both are gitignored: keep a backup of the two files somewhere safe. With Play App Signing this key is only the upload key and can be reset, but sideloaded installs need the same key to update.

**Linking the app and the site.** Chrome runs the app without a URL bar only if the site vouches for it: `public/.well-known/assetlinks.json` lists the package name and the SHA-256 of each key that signs it, and the app's `asset_statements` (in `app/build.gradle.kts`) points back at the site. Check the link with:

```
https://digitalassetlinks.googleapis.com/v1/assetlinks:check?source.web.site=https://workout.app.roberrini.com&relation=delegate_permission/common.handle_all_urls&target.android_app.package_name=com.roberrini.workout&target.android_app.certificate.sha256_fingerprint=<SHA-256>
```

When the app is published on Google Play with Play App Signing, Google re-signs it with its own key: add the **App signing key** SHA-256 from Play Console → Test and release → App integrity to `assetlinks.json` and redeploy the site, or the Play version shows a URL bar.

**Sign-in.** Nothing Android-specific: the app is the website, so Google sign-in uses the same web flow and the same OAuth client. In an installed app the site goes straight to the full-page redirect (`isInstalledApp` in `src/data/firebase.ts`), since a popup would open in a separate tab that can't report back. Google's own pages show a small toolbar (they're outside the app's site), then hand back to the app.

Gotchas:
- `app/proguard-rules.pro` keeps android-browser-helper's classes: the launcher enables `ManageDataLauncherActivity` by class, which must match the manifest after shrinking. That activity is what Settings → Apps → Workout Journal → Storage → "Manage space" opens.
- On a fresh emulator Chrome shows its first-run screens before it can host the app. For automated testing, skip them with `adb shell 'echo "_ --disable-fre --no-first-run" > /data/local/tmp/chrome-command-line'` and `adb shell am set-debug-app --persistent com.android.chrome` (undo with `am clear-debug-app`).

## Screenshots

The images in `docs/screenshots` are generated from demo data (9 weeks of training) by `scripts/screenshots/run.sh`. It drives the system WebKit at phone size, so it runs on macOS only. Start the dev server first (`bun run dev`), then:

```bash
sh scripts/screenshots/run.sh
```

`plan.mjs` holds the demo data and the list of screens; `hero.html` lays out the header image.

## Design

White background, near-black text and pill buttons, a serif display face (Newsreader) over Inter, and soft grainy pastel gradients ("auras") as set pieces at the top of each screen: dawn (Journal), lilac (logging), sunset (the active workout, which warms up as sets get checked), mint (Setup). Desktop is the same single column, centered.
