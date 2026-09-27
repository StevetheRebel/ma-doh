"use client";

import { ArrowLeft, ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import styles from "./welcome-screen.module.css";

const welcomeSteps = [
  {
    eyebrow: "Your money, made clear",
    title: "See where every shilling goes.",
    body: "Bring receipts, transaction messages, voice notes, and cash expenses into one financial record you can understand.",
  },
  {
    eyebrow: "Capture without the paperwork",
    title: "Turn everyday records into useful answers.",
    body: "Ma-Doh organises the details you provide, lets you review them, and shows the patterns behind your spending.",
  },
  {
    eyebrow: "Private by design",
    title: "You decide what Ma-Doh can use.",
    body: "Import only the financial records you choose. Review extracted details before they affect your dashboard.",
  },
] as const;

export function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const current = welcomeSteps[step];
  const isLast = step === welcomeSteps.length - 1;

  return (
    <main className={styles.welcome}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Ma-Doh welcome">
          <span>Ma</span><strong>Doh</strong>
        </Link>
        <Link className={styles.signInLink} href="/sign-in">Sign in</Link>
      </header>

      <section className={styles.content} aria-live="polite">
        <div className={styles.iconMark} aria-hidden="true">
          {step === 2 ? <LockKeyhole size={23} /> : step === 1 ? <Sparkles size={23} /> : <Check size={23} />}
        </div>
        <p className={styles.eyebrow}>{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <p className={styles.body}>{current.body}</p>

        <div className={styles.progress} aria-label={`Welcome step ${step + 1} of ${welcomeSteps.length}`}>
          {welcomeSteps.map((item, index) => (
            <button
              aria-label={`Go to welcome step ${index + 1}`}
              aria-current={index === step ? "step" : undefined}
              className={index === step ? styles.activeDot : ""}
              key={item.title}
              onClick={() => setStep(index)}
              type="button"
            />
          ))}
        </div>

        <div className={styles.actions}>
          {step > 0 ? (
            <button className={styles.backButton} onClick={() => setStep((value) => value - 1)} type="button">
              <ArrowLeft size={18} aria-hidden="true" />
              Back
            </button>
          ) : <span />}

          {isLast ? (
            <Link className={styles.nextButton} href="/sign-in">
              Get started
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <button className={styles.nextButton} onClick={() => setStep((value) => value + 1)} type="button">
              Continue
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
