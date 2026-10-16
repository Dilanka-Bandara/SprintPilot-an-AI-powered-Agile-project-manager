import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { firebaseAuth, firebaseConfigured } from '../../lib/firebase';
const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [session, setSession] = useState<{ user: User | null; ready: boolean }>(
    { user: null, ready: !firebaseConfigured },
  );
  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(firebaseAuth(), (user) => {
      // Never retain one account's cached workspace data when identity changes.
      void client.cancelQueries();
      client.clear();
      setSession({ user, ready: true });
    });
  }, [client]);
  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}
export function Protected({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  if (!ready)
    return (
      <div className="empty-state" role="status">
        Checking your session…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
