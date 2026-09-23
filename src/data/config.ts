const env = import.meta.env

/** Firebase web config from VITE_FIREBASE_* env vars, or null to run device-only. */
export const firebaseConfig = env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY as string,
      // Google's sign-in handler is served from our own host (proxied to firebaseapp.com by
      // vercel.json in production and vite.config.ts in dev). Redirect sign-in then stays
      // first-party, which Chrome/Safari storage partitioning and the Android wrapper need.
      authDomain: location.host,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string,
      appId: env.VITE_FIREBASE_APP_ID as string,
    }
  : null

export const cloudEnabled = firebaseConfig !== null
