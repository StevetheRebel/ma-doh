"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authConfigured, getSupabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
  error: string;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!authConfigured()) {
      queueMicrotask(() => {
        setError(
          "Supabase authentication is not configured. Set the frontend environment variables and restart Next.js.",
        );
        setLoading(false);
      });
      return;
    }
    let active = true;
    const supabase = getSupabase();
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(data.session);
        setError(error?.message ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Could not restore your session. Please sign in again.");
          setLoading(false);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Do not await Supabase calls inside this callback: they share an auth lock.
      if (active) {
        setSession(nextSession);
        setError("");
        setLoading(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function signOut() {
    const { error } = await getSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
    setSession(null);
  }
  return (
    <AuthContext.Provider value={{ session, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required.");
  return auth;
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !session && !error) router.replace("/sign-in");
  }, [loading, session, error, router]);
  if (loading)
    return (
      <main className="integration-state" role="status">
        Restoring your session…
      </main>
    );
  if (error)
    return (
      <main className="integration-state" role="alert">
        <h1>Authentication needs attention</h1>
        <p>{error}</p>
        <Link href="/sign-in">Back to sign in</Link>
      </main>
    );
  if (!session)
    return <main className="integration-state">Redirecting to sign in…</main>;
  // A changed identity remounts and clears every in-memory financial record.
  return <div key={session.user.id}>{children}</div>;
}
