"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useAppPreferences } from "@/components/layout/app-preferences";
import { formatKes } from "@/lib/finance";

import styles from "./financial-position-view.module.css";

type Entry = {
  id: string;
  name: string;
  amount: number;
};

const initialAssets: Entry[] = [
  { id: "a1", name: "Cash in hand", amount: 3200 },
  { id: "a2", name: "Equity Bank", amount: 62400 },
  { id: "a3", name: "M-Shwari savings", amount: 25000 },
];

const initialLiabilities: Entry[] = [
  { id: "l1", name: "Equity Loan", amount: 42000 },
  { id: "l2", name: "Owed to Brian", amount: 11000 },
];

const openingNetWorth = 110790;

export function FinancialPositionView() {
  const { hideAmounts } = useAppPreferences();
  const money = (value: number) =>
    hideAmounts ? "KES ••••••" : formatKes(value);

  const [assets, setAssets] = useState<Entry[]>(initialAssets);
  const [liabilities, setLiabilities] = useState<Entry[]>(initialLiabilities);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetAmount, setNewAssetAmount] = useState("");
  const [newLiabilityName, setNewLiabilityName] = useState("");
  const [newLiabilityAmount, setNewLiabilityAmount] = useState("");

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  const totalAssets = useMemo(
    () => assets.reduce((sum, item) => sum + item.amount, 0),
    [assets]
  );
  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, item) => sum + item.amount, 0),
    [liabilities]
  );
  const netWorth = totalAssets - totalLiabilities;
  const netWorthChange = netWorth - openingNetWorth;

  /* ---------- Edit handlers ---------- */
  const startEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditAmount(String(entry.amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAmount("");
  };

  const saveEdit = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<Entry[]>>
  ) => {
    const amount = Number(editAmount);
    if (!editName.trim() || !amount) return;
    setter((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: editName.trim(), amount } : item
      )
    );
    cancelEdit();
  };

  /* ---------- Delete handlers ---------- */
  const deleteEntry = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<Entry[]>>
  ) => {
    setter((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) cancelEdit();
  };

  /* ---------- Add handlers ---------- */
  const addAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newAssetAmount);
    if (!newAssetName.trim() || !amount) return;
    setAssets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newAssetName.trim(), amount },
    ]);
    setNewAssetName("");
    setNewAssetAmount("");
    setShowAddAsset(false);
  };

  const addLiability = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newLiabilityAmount);
    if (!newLiabilityName.trim() || !amount) return;
    setLiabilities((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newLiabilityName.trim(), amount },
    ]);
    setNewLiabilityName("");
    setNewLiabilityAmount("");
    setShowAddLiability(false);
  };

  /* ---------- Reusable entry row renderer ---------- */
  const renderEntry = (
    item: Entry,
    setter: React.Dispatch<React.SetStateAction<Entry[]>>
  ) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <li key={item.id} className={styles.editingRow}>
          <input
            className={styles.editInput}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.editInput}
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            min="0"
          />
          <div className={styles.rowActions}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.saveButton}`}
              onClick={() => saveEdit(item.id, setter)}
              aria-label="Save"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={cancelEdit}
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <span className={styles.entryName}>{item.name}</span>
        <span className={styles.amount}>{money(item.amount)}</span>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => startEdit(item)}
            aria-label={`Edit ${item.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.deleteButton}`}
            onClick={() => deleteEntry(item.id, setter)}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Financial Position</h1>
        <p>What you own, what you owe, and what&apos;s left</p>
      </header>

      <section className={styles.summaryGrid} aria-label="Financial summary">
        <article>
          <span>Total assets</span>
          <strong className={styles.positive}>{money(totalAssets)}</strong>
        </article>
        <article>
          <span>Total liabilities</span>
          <strong>{money(totalLiabilities)}</strong>
        </article>
        <article>
          <span>Net assets</span>
          <strong className={styles.positive}>{money(netWorth)}</strong>
          {netWorthChange !== 0 && (
            <small className={styles.positive}>
              +{money(netWorthChange)} this month
            </small>
          )}
        </article>
      </section>

      <div className={styles.columns}>
        {/* Assets */}
        <section className={styles.card} aria-label="Assets">
          <div className={styles.cardHeading}>
            <h2>Assets</h2>
            <span className={styles.total}>{money(totalAssets)}</span>
          </div>
          <p className={styles.entryCount}>{assets.length} entries</p>

          <ul className={styles.entryList}>
            {assets.map((item) => renderEntry(item, setAssets))}
          </ul>

          {showAddAsset ? (
            <form className={styles.addForm} onSubmit={addAsset}>
              <input
                type="text"
                placeholder="Asset name"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                autoFocus
              />
              <input
                type="number"
                placeholder="Amount"
                value={newAssetAmount}
                onChange={(e) => setNewAssetAmount(e.target.value)}
                min="0"
              />
              <div className={styles.formActions}>
                <button type="submit">Add</button>
                <button
                  type="button"
                  onClick={() => setShowAddAsset(false)}
                  className={styles.cancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setShowAddAsset(true)}
            >
              <Plus size={16} /> Add asset
            </button>
          )}
        </section>

        {/* Liabilities */}
        <section className={styles.card} aria-label="Liabilities">
          <div className={styles.cardHeading}>
            <h2>Liabilities</h2>
            <span className={styles.total}>{money(totalLiabilities)}</span>
          </div>
          <p className={styles.entryCount}>{liabilities.length} entries</p>

          <ul className={styles.entryList}>
            {liabilities.map((item) => renderEntry(item, setLiabilities))}
          </ul>

          {showAddLiability ? (
            <form className={styles.addForm} onSubmit={addLiability}>
              <input
                type="text"
                placeholder="Liability name"
                value={newLiabilityName}
                onChange={(e) => setNewLiabilityName(e.target.value)}
                autoFocus
              />
              <input
                type="number"
                placeholder="Amount"
                value={newLiabilityAmount}
                onChange={(e) => setNewLiabilityAmount(e.target.value)}
                min="0"
              />
              <div className={styles.formActions}>
                <button type="submit">Add</button>
                <button
                  type="button"
                  onClick={() => setShowAddLiability(false)}
                  className={styles.cancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setShowAddLiability(true)}
            >
              <Plus size={16} /> Add liability
            </button>
          )}
        </section>
      </div>
    </div>
  );
}