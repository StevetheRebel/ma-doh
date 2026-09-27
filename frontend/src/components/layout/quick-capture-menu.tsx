"use client";

import { Camera, MessageSquareText, Mic, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import styles from "./quick-capture-menu.module.css";

const captureOptions = [
  { label: "Scan receipt", href: "/transactions/add?method=receipt", icon: Camera, position: "receipt" },
  { label: "Record voice", href: "/transactions/add?method=voice", icon: Mic, position: "voice" },
  { label: "Paste message", href: "/transactions/add?method=message", icon: MessageSquareText, position: "message" },
  { label: "Enter manually", href: "/transactions/add/manual", icon: PencilLine, position: "manual" },
] as const;

export function QuickCaptureMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.root} ${open ? styles.open : ""}`}>
      {open ? (
        <button
          aria-label="Close quick capture menu"
          className={styles.dismissLayer}
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      {captureOptions.map(({ label, href, icon: Icon, position }) => (
        <Link
          aria-label={label}
          className={`${styles.option} ${styles[position]}`}
          href={href}
          key={label}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          title={label}
        >
          <span className={styles.optionLabel}>{label}</span>
          <Icon size={20} aria-hidden="true" />
        </Link>
      ))}

      <button
        aria-expanded={open}
        aria-label={open ? "Close quick capture menu" : "Add transaction"}
        className={styles.toggle}
        onClick={() => setOpen((value) => !value)}
        title={open ? "Close quick capture" : "Add transaction"}
        type="button"
      >
        <Plus size={26} aria-hidden="true" />
      </button>
    </div>
  );
}
