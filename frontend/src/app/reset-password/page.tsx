"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import styles from "./reset-password.module.css";
export default function ResetPassword() {
  const { session, loading } = useAuth();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. You can return to your dashboard.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Reset password</h1>
        <p className={styles.intro}>
          Choose a new password for your Ma-Doh account.
        </p>
        {loading ? (
          <p>Checking reset link…</p>
        ) : session ? (
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.field}>
              <span>New password</span>
              <input
                type="password"
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
              />
              <small>
                Use at least six characters and avoid reused passwords.
              </small>
            </label>
            <button className={styles.submit} disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p>Open the reset link from your email first.</p>
        )}
        {message && (
          <p className={styles.status} role="status">
            {message}
          </p>
        )}
        <Link
          className={styles.continue}
          href={session ? "/dashboard" : "/sign-in"}
        >
          Continue
        </Link>
      </section>
    </main>
  );
}
