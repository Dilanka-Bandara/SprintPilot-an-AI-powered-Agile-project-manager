import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowRight, Zap } from 'lucide-react';
import { firebaseAuth, firebaseConfigured } from '../../lib/firebase';
import { useAuth } from './AuthProvider';
function message(error: unknown) {
  if (!(error instanceof FirebaseError))
    return error instanceof Error
      ? error.message
      : 'Sign-in failed. Please try again.';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use':
      'An account already exists for this email. Sign in instead.',
    'auth/weak-password':
      'Choose a stronger password with at least 8 characters.',
    'auth/popup-closed-by-user':
      'The Google sign-in window was closed. You can try again.',
    'auth/popup-blocked':
      'Allow popups for this site, then try Google sign-in again.',
    'auth/unauthorized-domain':
      'Add this hostname to Firebase Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed':
      'Enable this sign-in provider in Firebase Authentication.',
    'auth/network-request-failed':
      'Could not reach Firebase. Check your internet connection.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  };
  return (
    messages[error.code] ??
    `Authentication failed (${error.code}). Please try again.`
  );
}
export function Login() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: () => Promise<unknown>, redirect = true) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (redirect) navigate('/workspaces');
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (ready && user && !busy) return <Navigate to="/workspaces" replace />;
  return (
    <div className="auth-page">
      <Link className="brand" to="/board">
        <span className="brand-icon">
          <Zap size={21} fill="currentColor" />
        </span>
        SprintPilot.
      </Link>
      <section className="auth-card">
        <span className="eyebrow">A HOME FOR YOUR TEAM</span>
        <h1>{signup ? 'Make room for great work.' : 'Welcome back.'}</h1>
        <p>
          {signup
            ? 'Create your account, then start your first workspace.'
            : 'Sign in to your real workspace and pick up where you left off.'}
        </p>
        {!firebaseConfigured && (
          <div className="error" role="alert">
            Firebase is not configured on this installation. See
            docs/AUTH_SETUP.md. You can still explore the demo.
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(async () => {
              const auth = firebaseAuth();
              const password = String(form.get('password'));
              if (signup) {
                const result = await createUserWithEmailAndPassword(
                  auth,
                  email,
                  password,
                );
                await updateProfile(result.user, {
                  displayName: String(form.get('name')).trim(),
                });
                await result.user.getIdToken(true);
              } else await signInWithEmailAndPassword(auth, email, password);
            });
          }}
        >
          {signup && (
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={signup ? 8 : undefined}
              required
              maxLength={128}
            />
          </label>
          <button
            className="primary auth-submit"
            disabled={busy || !firebaseConfigured}
          >
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="auth-divider">or</div>
        <button
          className="secondary auth-submit"
          disabled={busy || !firebaseConfigured}
          onClick={() =>
            void run(() =>
              signInWithPopup(firebaseAuth(), new GoogleAuthProvider()),
            )
          }
        >
          Continue with Google
        </button>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <p role="status" className="auth-notice">
            {notice}
          </p>
        )}
        <div className="auth-links">
          <button
            disabled={busy}
            onClick={() => {
              setSignup(!signup);
              setError('');
              setNotice('');
            }}
          >
            {signup
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </button>
          {!signup && (
            <button
              disabled={busy || !firebaseConfigured}
              onClick={() => {
                if (!email) {
                  setError('Enter your email above first.');
                  return;
                }
                void run(async () => {
                  await sendPasswordResetEmail(firebaseAuth(), email);
                  setNotice(
                    'If an account exists for this email, a password reset link will arrive shortly.',
                  );
                }, false);
              }}
            >
              Forgot password?
            </button>
          )}
        </div>
        <Link className="demo-link" to="/board">
          Just looking? Explore the local demo →
        </Link>
      </section>
      <p className="auth-footer">Small steps. Great sprints.</p>
    </div>
  );
}
