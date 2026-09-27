"use client";

import { ArrowRight, Mic, Search, Send, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useTransactions } from "@/features/transactions/transaction-provider";
import { calculateSummary, formatKes } from "@/lib/finance";

import styles from "./ask-money-view.module.css";

const suggestions = [
  "How much did I spend on transport?",
  "Where is most of my money going?",
  "What is my cash flow?",
] as const;

type Answer = {
  heading: string;
  detail: string;
  transactionIds: string[];
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function AskMoneyView() {
  const { transactions } = useTransactions();
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string>(suggestions[0]);
  const [isListening, setIsListening] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const questionBeforeSpeechRef = useRef("");
  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  const answer = useMemo<Answer>(() => {
    const normalized = submittedQuestion.toLowerCase();
    const confirmed = transactions.filter(
      (transaction) => transaction.verificationStatus === "confirmed",
    );

    if (normalized.includes("transport")) {
      const evidence = confirmed.filter(
        (transaction) =>
          transaction.type === "expense" && transaction.category === "Transport",
      );
      const total = evidence.reduce((sum, transaction) => sum + transaction.amount, 0);
      return {
        heading: formatKes(total),
        detail: `${evidence.length} confirmed transport transaction${evidence.length === 1 ? "" : "s"} in the available record.`,
        transactionIds: evidence.map((transaction) => transaction.id),
      };
    }

    if (normalized.includes("cash flow") || normalized.includes("left")) {
      return {
        heading: formatKes(summary.netCashFlow),
        detail: `${formatKes(summary.income)} income minus ${formatKes(summary.expenses)} expenses in the available record.`,
        transactionIds: confirmed.map((transaction) => transaction.id),
      };
    }

    const evidence = confirmed.filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.category === summary.largestCategory,
    );
    return {
      heading: summary.largestCategory ?? "No expense data",
      detail: summary.largestCategory
        ? `${formatKes(summary.largestCategoryTotal)} across ${evidence.length} confirmed transaction${evidence.length === 1 ? "" : "s"}.`
        : "Add a confirmed expense before asking about spending categories.",
      transactionIds: evidence.map((transaction) => transaction.id),
    };
  }, [submittedQuestion, summary, transactions]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) {
      return;
    }
    setSubmittedQuestion(nextQuestion);
    setQuestion("");
  }

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    setSpeechMessage("");
    const recognitionWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechMessage("Voice transcription is not supported in this browser. You can still type your question.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-KE";
    recognition.continuous = false;
    recognition.interimResults = true;
    questionBeforeSpeechRef.current = question.trim();

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const prefix = questionBeforeSpeechRef.current;
      setQuestion(`${prefix}${prefix && transcript ? " " : ""}${transcript}`.trimStart());
      setSpeechMessage(event.results[event.results.length - 1]?.isFinal ? "Transcription ready. Review it, then send." : "Listening and transcribing…");
    };
    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone access was blocked. Allow it in your browser to ask by voice."
        : event.error === "no-speech"
          ? "No speech was detected. Try again and speak clearly."
          : "Voice transcription stopped unexpectedly. Try again or type your question.";
      setSpeechMessage(message);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setSpeechMessage("Listening… Ask your question naturally.");
    } catch {
      setSpeechMessage("Voice transcription could not start. Try again or type your question.");
      recognitionRef.current = null;
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Financial intelligence" title="Ask My Money" />

      <section className={styles.askPanel}>
        <div className={styles.aiMark}><Sparkles size={22} aria-hidden="true" /></div>
        <p className={styles.question}>{submittedQuestion}</p>
        <div className={styles.answer} aria-live="polite">
          <span>Based on confirmed records</span>
          <strong>{answer.heading}</strong>
          <p>{answer.detail}</p>
        </div>

        {answer.transactionIds.length ? (
          <div className={styles.evidence}>
            <h2>Supporting transactions</h2>
            {answer.transactionIds.slice(0, 4).map((id) => {
              const transaction = transactions.find((item) => item.id === id);
              if (!transaction) return null;
              return (
                <Link href={`/transactions/${transaction.id}`} key={transaction.id}>
                  <span>{transaction.merchant}</span>
                  <strong>{formatKes(transaction.amount)}</strong>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className={styles.suggestions} aria-label="Suggested questions">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => setSubmittedQuestion(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className={styles.askForm} onSubmit={submit}>
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="money-question">Ask a question about your money</label>
        <input
          id="money-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about spending, income, or cash flow"
        />
        <button
          className={`${styles.voiceButton} ${isListening ? styles.listening : ""}`}
          type="button"
          aria-label={isListening ? "Stop voice transcription" : "Ask using your voice"}
          aria-pressed={isListening}
          title={isListening ? "Stop recording" : "Record question"}
          onClick={toggleVoiceInput}
        >
          {isListening ? <Square size={16} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
        </button>
        <button className={styles.sendButton} type="submit" aria-label="Ask question">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
      {speechMessage ? <p className={`${styles.speechStatus} ${isListening ? styles.activeStatus : ""}`} role="status">{speechMessage}</p> : null}
    </div>
  );
}
