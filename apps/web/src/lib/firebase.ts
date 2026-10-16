import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
export const firebaseConfigured = Object.values(config).every(Boolean);
export function firebaseAuth() {
  if (!firebaseConfigured)
    throw new Error('Firebase is not configured. Follow docs/AUTH_SETUP.md.');
  const app =
    getApps().find((app) => app.name === 'sprintpilot-web') ??
    initializeApp(config, 'sprintpilot-web');
  return getAuth(app);
}
