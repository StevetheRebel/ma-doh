"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./sign-in-form.module.css";

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [resetNotice, setResetNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual} aria-label="Ma-Doh financial records">
        <Link className={styles.visualBrand} href="/">
          <span>Ma</span><strong>Doh</strong>
        </Link>
        <div>
          <LockKeyhole size={24} aria-hidden="true" />
          <p>Your records stay under your control.</p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <Link className={styles.backLink} href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            Back
          </Link>

          <div className={styles.mobileBrand} aria-hidden="true">
            <span>Ma</span><strong>Doh</strong>
          </div>

          <p className={styles.eyebrow}>Welcome back</p>
          <h1>Sign in to Ma-Doh</h1>
          <p className={styles.intro}>Continue to your personal financial overview.</p>

          <form onSubmit={submit}>
            <label>
              <span>Email address</span>
              <input autoComplete="email" defaultValue="steve@example.com" required type="email" />
            </label>

            <label>
              <span>Password</span>
              <div className={styles.passwordField}>
                <input autoComplete="current-password" defaultValue="madoh-demo" minLength={8} required type={showPassword ? "text" : "password"} />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className={styles.formMeta}>
              <label className={styles.remember}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <button
                className={styles.textButton}
                onClick={() => setResetNotice("Password recovery is not connected in this prototype.")}
                type="button"
              >
                Forgot password?
              </button>
            </div>

            {resetNotice ? <p className={styles.resetNotice} role="status">{resetNotice}</p> : null}

            <button className={styles.submitButton} type="submit">
              Sign in
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <div className={styles.demoNotice}>
            <strong>Prototype access</strong>
            <p>Any valid-looking email and eight-character password opens the fictional demo account.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
