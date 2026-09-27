"use client";

import { Bell, CalendarDays, Eye, EyeOff, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  appPeriods,
  type AppPeriod,
  useAppPreferences,
} from "@/components/layout/app-preferences";

import styles from "./app-topbar.module.css";
import Image from "next/image";
// import logo from "@/../public/images/full_logo.png";

export function AppTopbar() {
  const { period, setPeriod, hideAmounts, toggleAmounts } = useAppPreferences();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className={styles.topbar}>
      <div className={styles.identity}>
        <Link
          className={styles.brand}
          href="/dashboard"
          aria-label="Ma-Doh dashboard"
        >
          <Image
            src="/images/full_logo.png"
            alt="Ma-Doh Logo"
            width={500}
            height={500}
          />
        </Link>
        <div className={styles.greeting}>
          <strong>
              <span className={styles.desktopGreeting}>
                Good morning, Steve
              </span>
            <span className={styles.mobileGreeting}>Steve</span>
          </strong>
          <span>
            {new Date().toLocaleDateString("en-Gb", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <label className={styles.periodControl}>
          <CalendarDays size={16} aria-hidden="true" />
          <span className="sr-only">Dashboard period</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AppPeriod)}
          >
            {appPeriods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          aria-label={
            hideAmounts ? "Show monetary values" : "Hide monetary values"
          }
          aria-pressed={hideAmounts}
          className={styles.iconButton}
          onClick={toggleAmounts}
          title={hideAmounts ? "Show monetary values" : "Hide monetary values"}
          type="button"
        >
          {hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <div className={styles.actionMenu}>
          <button
            aria-expanded={notificationsOpen}
            aria-label="Notifications"
            className={styles.iconButton}
            onClick={() => {
              setNotificationsOpen((value) => !value);
              setProfileOpen(false);
            }}
            type="button"
          >
            <Bell size={18} aria-hidden="true" />
            <span className={styles.notificationDot} />
          </button>
          {notificationsOpen ? (
            <div className={styles.menuPanel} role="status">
              <strong>You are up to date</strong>
              <span>No transaction needs review.</span>
            </div>
          ) : null}
        </div>

        <div className={styles.actionMenu}>
          <button
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
            className={styles.profileButton}
            onClick={() => {
              setProfileOpen((value) => !value);
              setNotificationsOpen(false);
            }}
            type="button"
          >
            <UserRound size={18} aria-hidden="true" />
          </button>
          {profileOpen ? (
            <div className={`${styles.menuPanel} ${styles.profileMenu}`}>
              <strong>Steve</strong>
              <span>Demo account</span>
              <Link href="/sign-in">Sign out</Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
