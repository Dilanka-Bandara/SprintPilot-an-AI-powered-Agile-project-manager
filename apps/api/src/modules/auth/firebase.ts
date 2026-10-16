import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
export const identitySchema = z.object({
  uid: z.string().min(1).max(128),
  email: z.email(),
  name: z.string().max(200).optional(),
});
export type Identity = z.infer<typeof identitySchema>;
export type VerifyToken = (token: string) => Promise<Identity>;
export function firebaseVerifier(projectId: string): VerifyToken {
  const name = `sprintpilot-${projectId}`;
  const firebase =
    getApps().find((app) => app.name === name) ??
    initializeApp({ projectId }, name);
  return async (token) => {
    // Signature, issuer, audience and expiration are checked by the Admin SDK.
    // Account administration/revocation checks will require ADC in the deployment milestone.
    const decoded = await getAuth(firebase).verifyIdToken(token);
    return identitySchema.parse(decoded);
  };
}
