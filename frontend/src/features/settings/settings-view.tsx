"use client";

import {
  Bell,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Lock,
  Mic,
  ScanLine,
  Shield,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { useAppPreferences } from "@/components/layout/app-preferences";

import styles from "./settings-view.module.css";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}

export function SettingsView() {
  // Read once from context so the toggle starts in sync with the rest of the app.
  // Replace the four useState calls with context setters if `useAppPreferences`
  // exposes them (e.g. setHideAmounts, setNotifications, setWeeklySummary).
  const { hideAmounts } = useAppPreferences();

  const [blurAmounts, setBlurAmounts] = useState(hideAmounts);
  const [notifications, setNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Settings</h1>
        <p>Your account, preferences and privacy</p>
      </header>

      {/* ---------- Profile card ---------- */}
      <section className={styles.profileCard} aria-label="Account">
        <div className={styles.avatar} aria-hidden="true">
          WK
        </div>
        <div className={styles.profileInfo}>
          <strong>Wanjiku Kamau</strong>
          <span>wanjiku.k@example.co.ke</span>
        </div>
        <button type="button" className={styles.editButton}>
          Edit
        </button>
      </section>

      {/* ---------- Preferences ---------- */}
      <p className={styles.sectionLabel}>Preferences</p>
      <div className={styles.listCard}>
        <div className={styles.row}>
          <span className={styles.iconBubble}>
            <CircleDollarSign size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Default currency</span>
            <span className={styles.rowDesc}>Used across all amounts</span>
          </div>
          <span className={styles.rowValue}>KES · Kenyan Shilling</span>
        </div>

        <div className={styles.row}>
          <span className={styles.iconBubble}>
            <Eye size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Hide monetary values</span>
            <span className={styles.rowDesc}>
              Blur all amounts across the app
            </span>
          </div>
          <Toggle
            label="Hide monetary values"
            checked={blurAmounts}
            onChange={setBlurAmounts}
          />
        </div>

        <div className={styles.row}>
          <span className={styles.iconBubble}>
            <Bell size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Notifications</span>
            <span className={styles.rowDesc}>
              Recurring payment and budget alerts
            </span>
          </div>
          <Toggle
            label="Notifications"
            checked={notifications}
            onChange={setNotifications}
          />
        </div>

        <div className={styles.row}>
          <span className={styles.iconBubble}>
            <FileText size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Weekly summary</span>
            <span className={styles.rowDesc}>
              A digest of your week every Monday
            </span>
          </div>
          <Toggle
            label="Weekly summary"
            checked={weeklySummary}
            onChange={setWeeklySummary}
          />
        </div>
      </div>

      {/* ---------- Data & sources ---------- */}
      <p className={styles.sectionLabel}>Data &amp; Sources</p>
      <div className={styles.listCard}>
        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <ScanLine size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Transaction sources</span>
            <span className={styles.rowDesc}>
              Receipt photos, M-Pesa messages, bank messages, voice, manual
            </span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>

        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <Tag size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Categories</span>
            <span className={styles.rowDesc}>
              12 categories · 4 auto-categorisation rules
            </span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>

        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <Download size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Export my data</span>
            <span className={styles.rowDesc}>
              Download all records as CSV or JSON
            </span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>
      </div>

      {/* ---------- Privacy centre ---------- */}
      <p className={styles.sectionLabel}>Privacy Centre</p>

      <div className={styles.privacyCard}>
        <div className={styles.privacySection}>
          <div className={styles.privacyHeader}>
            <Shield size={16} aria-hidden="true" />
            <span>What Ma-Doh stores</span>
          </div>
          <ul className={styles.privacyList}>
            <li>
              <Check size={14} className={styles.checkIcon} aria-hidden="true" />
              Transaction details you confirm
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} aria-hidden="true" />
              Categories and notes you add
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} aria-hidden="true" />
              Your financial position entries
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} aria-hidden="true" />
              Recurring payment records
            </li>
          </ul>
        </div>

        <div className={styles.privacyDivider} />

        <div className={styles.privacySection}>
          <div className={`${styles.privacyHeader} ${styles.headerRed}`}>
            <X size={16} aria-hidden="true" />
            <span>What Ma-Doh does not store</span>
          </div>
          <ul className={styles.privacyList}>
            <li>
              <X size={14} className={styles.xIcon} aria-hidden="true" />
              Raw M-Pesa or bank messages
            </li>
            <li>
              <X size={14} className={styles.xIcon} aria-hidden="true" />
              Receipt images after extraction
            </li>
            <li>
              <X size={14} className={styles.xIcon} aria-hidden="true" />
              Voice recordings after transcription
            </li>
            <li>
              <X size={14} className={styles.xIcon} aria-hidden="true" />
              Your contacts or full message history
            </li>
          </ul>
        </div>
      </div>

      <div className={`${styles.listCard} ${styles.privacyActions}`}>
        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <FileText size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Imported data history</span>
            <span className={styles.rowDesc}>
              26 records imported this month
            </span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>

        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <ImageIcon size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Delete receipt images</span>
            <span className={styles.rowDesc}>Remove all stored receipt photos</span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>

        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <Mic size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Delete voice recordings</span>
            <span className={styles.rowDesc}>Remove all stored recordings</span>
          </div>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </button>

        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={styles.iconBubble}>
            <Lock size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={styles.rowTitle}>Revoke connected source</span>
            <span className={styles.rowDesc}>No external sources connected</span>
          </div>
          <span className={styles.rowValue}>None</span>
        </button>
      </div>

      {/* ---------- Danger zone ---------- */}
      <p className={styles.sectionLabel}>Danger Zone</p>
      <div className={`${styles.listCard} ${styles.dangerCard}`}>
        <button type="button" className={`${styles.row} ${styles.rowButton}`}>
          <span className={`${styles.iconBubble} ${styles.iconBubbleRed}`}>
            <Trash2 size={17} aria-hidden="true" />
          </span>
          <div className={styles.rowText}>
            <span className={`${styles.rowTitle} ${styles.titleRed}`}>
              Delete all data
            </span>
            <span className={styles.rowDesc}>
              Permanently remove every record Ma-Doh holds
            </span>
          </div>
          <ChevronRight size={16} className={styles.chevronRed} aria-hidden="true" />
        </button>
      </div>

      {/* ---------- Footer note ---------- */}
      <p className={styles.footerNote}>
        Ma-Doh processes only the financial information you choose to provide.
        This is a frontend prototype using fictional data — no real messages,
        accounts or phone numbers are read or stored.
      </p>
    </div>
  );
}