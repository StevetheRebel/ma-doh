"use client";

import {
  Camera,
  Check,
  FileAudio,
  ImageUp,
  Mic,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountRequiredModal } from "@/features/accounts/account-required-modal";
import { useTransactions } from "./transaction-provider";
import styles from "./transaction-pages.module.css";

export type CaptureMethod = "receipt" | "voice" | "message";
type CameraShot = { file: File; url: string };

export function CaptureMethodPanel({ method }: { method: CaptureMethod }) {
  const { accounts, capture } = useTransactions(),
    router = useRouter();
  const [account, setAccount] = useState(accounts[0]?.id ?? ""),
    [file, setFile] = useState<File | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [preview, setPreview] = useState(""),
    [cameraShot, setCameraShot] = useState<CameraShot | null>(null),
    [cameraError, setCameraError] = useState(""),
    [cameraLoading, setCameraLoading] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    audioStream = useRef<MediaStream | null>(null),
    cameraStream = useRef<MediaStream | null>(null),
    cameraDialog = useRef<HTMLDialogElement>(null),
    cameraVideo = useRef<HTMLVideoElement>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  useEffect(() => {
    if (cameraVideo.current && cameraStream.current && !cameraShot) {
      cameraVideo.current.srcObject = cameraStream.current;
      void cameraVideo.current.play();
    }
  }, [cameraShot, cameraLoading]);

  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      audioStream.current?.getTracks().forEach((track) => track.stop());
      cameraStream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function chooseFile(next: File | null) {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : "");
  }

  async function record() {
    try {
      setError("");
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording is unavailable in this browser. Upload an audio file instead.",
        );
      audioStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const nextRecorder = new MediaRecorder(
        audioStream.current,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = nextRecorder;
      const chunks: Blob[] = [];
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      nextRecorder.onstop = () => {
        const type = nextRecorder.mimeType.split(";")[0];
        chooseFile(
          new File(
            chunks,
            `recording.${type.includes("mp4") ? "m4a" : "webm"}`,
            { type },
          ),
        );
        audioStream.current?.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      nextRecorder.start();
      setRecording(true);
    } catch (e) {
      audioStream.current?.getTracks().forEach((track) => track.stop());
      setError((e as Error).message);
    }
  }

  function stopCamera() {
    cameraStream.current?.getTracks().forEach((track) => track.stop());
    cameraStream.current = null;
  }

  function clearCameraShot() {
    if (cameraShot) URL.revokeObjectURL(cameraShot.url);
    setCameraShot(null);
  }

  async function openCamera() {
    setCameraError("");
    setCameraLoading(true);
    clearCameraShot();
    cameraDialog.current?.showModal();
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera capture is unavailable in this browser. Upload a photo instead.",
        );
      cameraStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCameraLoading(false);
    } catch (e) {
      stopCamera();
      setCameraLoading(false);
      setCameraError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera access or upload a receipt photo instead."
          : (e as Error).message,
      );
    }
  }

  function closeCamera() {
    stopCamera();
    clearCameraShot();
    setCameraError("");
    setCameraLoading(false);
    cameraDialog.current?.close();
  }

  async function takePhoto() {
    const video = cameraVideo.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still starting. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setCameraError("The photo could not be captured. Please try again.");
      return;
    }
    const captured = new File([blob], `receipt-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    setCameraError("");
    setCameraShot({ file: captured, url: URL.createObjectURL(captured) });
  }

  function useCameraShot() {
    if (!cameraShot) return;
    chooseFile(cameraShot.file);
    closeCamera();
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (method !== "message" && !file)
        throw new Error(
          method === "receipt"
            ? "Take or upload a receipt photo first."
            : "Record or upload an audio file first.",
        );
      if (file && file.size > 10 * 1024 * 1024)
        throw new Error("Files must be 10 MB or smaller.");
      const result = await capture(
        method,
        account,
        method === "message" ? message : file!,
      );
      if (!result.drafts.length)
        throw new Error(
          result.warnings.join(" ") ||
            "No transactions were found. Try a clearer input.",
        );
      router.push("/transactions/review");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!accounts.length) return <AccountRequiredModal />;

  const title =
    method === "receipt"
      ? "Scan a receipt"
      : method === "voice"
        ? "Record a transaction"
        : "Paste a transaction message";

  return (
    <section className={styles.capturePanel}>
      <div className={styles.captureHeading}>
        <span>AI-assisted capture</span>
        <h2>{title}</h2>
        <p>
          {method === "receipt"
            ? "Take a clear photo or upload one. Keep the merchant, date, and total visible."
            : method === "voice"
              ? "Speak naturally and include the amount, date, and what the transaction was for."
              : "Paste the full M-Pesa or bank message, including its amount and date."}
        </p>
      </div>

      <div className={styles.captureAccountField}>
        <label htmlFor="capture-account">Save to account</label>
        <select
          id="capture-account"
          value={account}
          onChange={(event) => setAccount(event.target.value)}
        >
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <small>The confirmed transaction will update this account.</small>
      </div>

      {method === "message" ? (
        <div className={styles.messageCapture}>
          <label htmlFor="transaction-message">M-Pesa or bank message</label>
          <textarea
            id="transaction-message"
            maxLength={12000}
            placeholder="Paste the complete transaction message here…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <span>{message.length.toLocaleString()} / 12,000 characters</span>
        </div>
      ) : method === "receipt" ? (
        <div className={styles.receiptCapture}>
          {preview ? (
            <div className={styles.imagePreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Selected receipt" src={preview} />
              <button
                aria-label="Remove receipt photo"
                onClick={() => chooseFile(null)}
                type="button"
              >
                <X size={18} />
              </button>
              <span>{file?.name}</span>
            </div>
          ) : (
            <div className={styles.capturePlaceholder}>
              <Camera size={30} aria-hidden="true" />
              <strong>Add a receipt photo</strong>
              <span>JPEG, PNG, or WebP · Maximum 10 MB</span>
            </div>
          )}
          <div className={styles.captureActions}>
            <button
              className={styles.primaryAction}
              disabled={busy}
              onClick={() => void openCamera()}
              type="button"
            >
              <Camera size={17} aria-hidden="true" />
              Open camera
            </button>
            <label className={styles.uploadButton}>
              <ImageUp size={17} aria-hidden="true" />
              Upload photo
              <input
                accept="image/jpeg,image/png,image/webp"
                className={styles.visuallyHidden}
                disabled={busy}
                onChange={(event) =>
                  chooseFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className={styles.voiceCapture}>
          <div
            className={`${styles.micStatus} ${recording ? styles.isRecording : ""}`}
          >
            {recording ? <Square size={28} /> : <Mic size={30} />}
            <strong>{recording ? "Recording…" : "Ready to record"}</strong>
            <span>
              {recording
                ? "Tap stop when you are finished"
                : "Or upload an existing audio file below"}
            </span>
          </div>
          <div className={styles.captureActions}>
            <button
              className={recording ? styles.dangerAction : styles.primaryAction}
              disabled={busy}
              onClick={() =>
                recording ? recorder.current?.stop() : void record()
              }
              type="button"
            >
              {recording ? <Square size={16} /> : <Mic size={17} />}
              {recording ? "Stop recording" : "Start recording"}
            </button>
            <label className={styles.uploadButton}>
              <FileAudio size={17} aria-hidden="true" />
              Upload audio
              <input
                accept="audio/mpeg,audio/mp4,audio/wav,audio/webm"
                className={styles.visuallyHidden}
                disabled={recording || busy}
                onChange={(event) =>
                  chooseFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
          </div>
          {preview && <audio className={styles.audioPlayer} controls src={preview} />}
          {file && <span className={styles.selectedFile}>{file.name}</span>}
        </div>
      )}

      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button
          className={styles.primaryAction}
          disabled={
            busy || recording || (method === "message" ? !message.trim() : !file)
          }
          onClick={() => void submit()}
          type="button"
        >
          {busy ? "Extracting transactions…" : "Extract and review"}
        </button>
      </div>

      {method === "receipt" && (
        <dialog
          aria-describedby="camera-modal-description"
          aria-labelledby="camera-modal-title"
          className={styles.cameraModal}
          onCancel={(event) => {
            event.preventDefault();
            closeCamera();
          }}
          ref={cameraDialog}
        >
          <div className={styles.cameraModalHeader}>
            <div>
              <span>Receipt camera</span>
              <h2 id="camera-modal-title">
                {cameraShot ? "Check your photo" : "Frame the full receipt"}
              </h2>
            </div>
            <button aria-label="Close camera" onClick={closeCamera} type="button">
              <X size={20} />
            </button>
          </div>
          <p className={styles.cameraModalDescription} id="camera-modal-description">
            {cameraShot
              ? "Make sure the merchant, date, and total are sharp and readable."
              : "Hold the camera steady and keep every edge of the receipt in view."}
          </p>

          <div className={styles.cameraViewport}>
            {cameraShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Captured receipt preview" src={cameraShot.url} />
            ) : cameraLoading ? (
              <div className={styles.cameraState} role="status">
                <Camera size={30} />
                <span>Starting camera…</span>
              </div>
            ) : cameraError ? (
              <div className={styles.cameraState}>
                <Camera size={30} />
                <span>Camera preview unavailable</span>
              </div>
            ) : (
              <video muted playsInline ref={cameraVideo} />
            )}
          </div>

          {cameraError && (
            <p className={styles.errorBanner} role="alert">
              {cameraError}
            </p>
          )}

          <div className={styles.cameraModalActions}>
            {cameraShot ? (
              <>
                <button
                  className={styles.primaryAction}
                  onClick={useCameraShot}
                  type="button"
                >
                  <Check size={17} />
                  Use this photo
                </button>
                <button
                  className={styles.secondaryAction}
                  onClick={clearCameraShot}
                  type="button"
                >
                  <RotateCcw size={17} />
                  Back to camera
                </button>
                <button
                  className={styles.modalTextAction}
                  onClick={closeCamera}
                  type="button"
                >
                  <Trash2 size={16} />
                  Discard
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.cameraShutter}
                  disabled={cameraLoading || Boolean(cameraError)}
                  onClick={() => void takePhoto()}
                  type="button"
                >
                  <span />
                  Capture photo
                </button>
                <button
                  className={styles.modalTextAction}
                  onClick={closeCamera}
                  type="button"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
