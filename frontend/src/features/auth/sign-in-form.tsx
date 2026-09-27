"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./sign-in-form.module.css";
export function SignInForm() {
  const router = useRouter();
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const normalizedEmail = email.trim();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const auth = getSupabase().auth;
      const result = signup
        ? await auth.signUp({
            email: normalizedEmail,
            password: String(data.get("password")),
            options: {
              data: { display_name: String(data.get("name")).trim() },
              emailRedirectTo: `${location.origin}/dashboard`,
            },
          })
        : await auth.signInWithPassword({
            email: normalizedEmail,
            password: String(data.get("password")),
          });
      if (result.error) throw result.error;
      if (result.data.session) router.replace("/dashboard");
      else
        setNotice(
          `Account created. Check ${normalizedEmail} for the confirmation link, then sign in.`,
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError("");
    try {
      if (!email.trim()) throw new Error("Enter your email first.");
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password`,
      });
      if (error) throw error;
      setNotice("If an account exists, a reset link has been sent.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.visual}>
        <Link href="/" className={styles.visualBrand}>
          Ma-Doh
        </Link>
        <div>
          <p>Understand your money.</p>
          <span>Capture, review, and see where it goes.</span>
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <form aria-busy={busy} onSubmit={submit}>
            <h1>{signup ? "Create your account" : "Welcome back"}</h1>
            {signup && (
              <label>
                Name
                <input name="name" required autoComplete="name" />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </label>
            {error && (
              <p className={styles.authError} role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className={styles.authNotice} role="status">
                {notice}
              </p>
            )}
            <button disabled={busy} type="submit">
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
            <button disabled={busy} type="button" onClick={reset}>
              Forgot password?
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => {
                setSignup(!signup);
                setError("");
                setNotice("");
              }}
            >
              {signup ? "Already registered? Sign in" : "Create an account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
