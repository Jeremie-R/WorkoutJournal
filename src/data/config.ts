const env = import.meta.env

/** Firebase web config from VITE_FIREBASE_* env vars, or null to run device-only. */
export const firebaseConfig = env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY as string,
      authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string,
      appId: env.VITE_FIREBASE_APP_ID as string,
    }
  : null

export const cloudEnabled = firebaseConfig !== null
