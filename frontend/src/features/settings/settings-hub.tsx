"use client";

import { Landmark, Settings } from "lucide-react";
import { useState } from "react";

import { AccountsView } from "@/features/accounts/accounts-view";

import { SettingsView } from "./settings-view";
import styles from "./settings-hub.module.css";

export function SettingsHub() {
  const [section, setSection] = useState<"accounts" | "preferences">("accounts");
  return (
    <div>
      <nav className={styles.tabs} aria-label="Settings sections">
        <button className={section === "accounts" ? styles.active : ""} type="button" onClick={() => setSection("accounts")}><Landmark size={17} aria-hidden="true" />Accounts</button>
        <button className={section === "preferences" ? styles.active : ""} type="button" onClick={() => setSection("preferences")}><Settings size={17} aria-hidden="true" />Preferences</button>
      </nav>
      {section === "accounts" ? <AccountsView /> : <SettingsView />}
    </div>
  );
}
