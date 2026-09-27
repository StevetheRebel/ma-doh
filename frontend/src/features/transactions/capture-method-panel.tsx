"use client";

import { Camera, Check, FileImage, MessageSquareText, Mic, Square, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { useTransactions } from "@/features/transactions/transaction-provider";
import { transactionDraftSchema, type Transaction } from "@/types/transaction";

import styles from "./transaction-pages.module.css";

export type CaptureMethod = "receipt" | "voice" | "message";

const headings: Record<CaptureMethod, { eyebrow: string; title: string; detail: string }> = {
  receipt: { eyebrow: "Receipt capture", title: "Scan a receipt", detail: "Take a clear photo or choose an existing image." },
  voice: { eyebrow: "Voice capture", title: "Record a transaction", detail: "Describe the amount, source, and what it was for." },
  message: { eyebrow: "Message capture", title: "Paste transaction message", detail: "Paste only the M-Pesa or bank transaction message you want to import." },
};

function draftFromCapture(source: CaptureMethod, overrides: Partial<Transaction> = {}): Transaction {
  const now = new Date().toISOString();
  return transactionDraftSchema.parse({
    id: crypto.randomUUID(), type: "expense", amount: 1, currency: "KES",
    merchant: "Review source", category: "Other", description: "",
    transactionDate: now, paymentMethod: source === "message" ? "M-Pesa" : "Other",
    reference: null, source, confidence: 0.82, verificationStatus: "draft",
    createdAt: now, recurring: false, attachmentName: null, ...overrides,
  });
}

function extractMessageDraft(message: string) {
  const amountMatch = message.match(/(?:KES|Ksh\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const merchantMatch = message.match(/(?:paid to|sent to|from)\s+([^\.\n]+?)(?:\s+on\s|\.|$)/i);
  return draftFromCapture("message", {
    amount: amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : 1,
    merchant: merchantMatch?.[1]?.trim() || "Review message source",
    description: message.slice(0, 240),
  });
}

export function CaptureMethodPanel({ method }: { method: CaptureMethod }) {
  const router = useRouter();
  const { setPendingDraft } = useTransactions();
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (image) URL.revokeObjectURL(image.url);
    setImage({ file, url: URL.createObjectURL(file) });
    setError("");
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType })));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was not available. Check your browser permission and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function continueToReview() {
    setError("");
    if (method === "receipt" && !image) return setError("Take a photo or choose a receipt image first.");
    if (method === "voice" && !audioUrl) return setError("Record a voice note first.");
    if (method === "message" && !message.trim()) return setError("Paste a transaction message first.");

    const draft = method === "message"
      ? extractMessageDraft(message.trim())
      : draftFromCapture(method, {
          description: method === "voice" ? "Voice transaction ready for transcription" : "Receipt ready for extraction",
          attachmentName: image?.file.name ?? null,
        });
    setPendingDraft(draft);
    router.push("/transactions/review");
  }

  const copy = headings[method];
  return (
    <section className={styles.capturePanel} aria-labelledby="capture-title">
      <div className={styles.captureHeading}><span>{copy.eyebrow}</span><h2 id="capture-title">{copy.title}</h2><p>{copy.detail}</p></div>
      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      {method === "receipt" ? (
        <div className={styles.receiptCapture}>
          {image ? (
            <div className={styles.imagePreview}><Image src={image.url} alt="Selected receipt preview" width={720} height={960} unoptimized /><button type="button" onClick={() => setImage(null)} aria-label="Remove selected receipt"><X size={18} /></button><span>{image.file.name}</span></div>
          ) : (
            <div className={styles.capturePlaceholder}><FileImage size={34} /><strong>No receipt selected</strong><span>JPG, PNG, HEIC, or a camera photo</span></div>
          )}
          <div className={styles.captureActions}>
            <label className={styles.primaryAction} htmlFor="camera-receipt"><Camera size={18} />Take photo</label>
            <input className={styles.visuallyHidden} id="camera-receipt" type="file" accept="image/*" capture="environment" onChange={selectImage} />
            <label className={styles.secondaryAction} htmlFor="upload-receipt"><Upload size={18} />Choose image</label>
            <input className={styles.visuallyHidden} id="upload-receipt" type="file" accept="image/*" onChange={selectImage} />
          </div>
        </div>
      ) : null}

      {method === "voice" ? (
        <div className={styles.voiceCapture}>
          <div className={`${styles.micStatus} ${recording ? styles.isRecording : ""}`}><Mic size={30} /><strong>{recording ? "Recording…" : audioUrl ? "Recording ready" : "Ready to record"}</strong><span>{recording ? "Speak clearly, then stop when finished" : "Your recording stays in this browser during review"}</span></div>
          {audioUrl ? <audio className={styles.audioPlayer} src={audioUrl} controls /> : null}
          <button className={recording ? styles.dangerAction : styles.primaryAction} type="button" onClick={recording ? stopRecording : startRecording}>{recording ? <Square size={17} /> : <Mic size={18} />}{recording ? "Stop recording" : audioUrl ? "Record again" : "Start recording"}</button>
        </div>
      ) : null}

      {method === "message" ? (
        <div className={styles.messageCapture}><label htmlFor="transaction-message"><MessageSquareText size={18} />Transaction message</label><textarea id="transaction-message" maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Paste an M-Pesa or bank transaction message here…" /><span>{message.length}/1200 characters</span></div>
      ) : null}

      <div className={styles.formActions}><button className={styles.primaryAction} type="button" onClick={continueToReview}><Check size={18} />Extract and review</button></div>
    </section>
  );
}
