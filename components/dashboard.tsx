"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_INPUT_LENGTH, type InputKind } from "@/lib/debug-types";
import { EXAMPLES } from "@/lib/mock-analysis";
import { analyzeError } from "@/lib/analyze-client";
import { saveSession } from "@/lib/session-storage";
import { EmptyState, SessionsLoading } from "./empty-state";
import { Icon, type IconName } from "./icon";
import { SessionList } from "./session-list";
import { useSessions } from "./use-sessions";
import styles from "./devfix.module.css";

const inputModes: {
  id: InputKind;
  label: string;
  icon: IconName;
  placeholder: string;
}[] = [
  {
    id: "error",
    label: "Error message",
    icon: "error",
    placeholder:
      "Paste your error message here…\n\nTypeError: Cannot read properties of undefined (reading 'map')\n    at UsersList (src/components/UsersList.tsx:15:23)",
  },
  {
    id: "code",
    label: "Code snippet",
    icon: "code",
    placeholder:
      "Paste the code that's giving you trouble…\n\nInclude the error message and the failing line for context.",
  },
  {
    id: "logs",
    label: "Logs",
    icon: "logs",
    placeholder:
      "Paste your stack trace or console logs here…\n\nInclude the first error and any relevant stack frames.",
  },
];

export function Dashboard() {
  const router = useRouter();
  const { sessions, ready } = useSessions();
  const [input, setInput] = useState("");
  const [inputKind, setInputKind] = useState<InputKind>("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !ready) return;
    if (!input.trim()) {
      setError("Paste an error message, code snippet, or logs to get started.");
      textarea.current?.focus();
      return;
    }
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    pending.current = controller;
    try {
      const session = await analyzeError(input, inputKind, controller.signal);
      saveSession(session);
      router.push(`/analysis/?id=${encodeURIComponent(session.id)}`);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try analyzing your error again.",
      );
    } finally {
      setLoading(false);
      pending.current = null;
    }
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardContent}>
        <section className={styles.hero} aria-labelledby="home-title">
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            LESS GUESSWORK. MORE PROGRESS.
          </span>
          <h1 id="home-title">
            DevFix <span>AI</span>
            <span className={styles.heroCursor} aria-hidden="true">
              _
            </span>
          </h1>
          <p className={styles.tagline}>
            Paste an error. <span>Understand the cause.</span> Get a fix.
          </p>
          <p className={styles.heroDescription}>
            A clearer path from <code>something broke</code> to{" "}
            <code>problem solved</code>.
          </p>
        </section>
        <form
          ref={form}
          onSubmit={handleSubmit}
          className={styles.inputCard}
          aria-busy={loading}
          noValidate
        >
          <div className={styles.inputToolbar}>
            <div
              className={styles.inputModes}
              role="group"
              aria-label="Input format"
            >
              {inputModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={inputKind === mode.id}
                  disabled={loading}
                  onClick={() => setInputKind(mode.id)}
                  className={`${styles.modeButton} ${inputKind === mode.id ? styles.modeActive : ""}`}
                >
                  <Icon name={mode.icon} size={16} />
                  {mode.label}
                </button>
              ))}
            </div>
            <span className={styles.editorDots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className={styles.textareaWrap}>
            <label htmlFor="debug-input" className={styles.srOnly}>
              Error message, code, or logs
            </label>
            <textarea
              ref={textarea}
              id="debug-input"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (error) setError(null);
              }}
              placeholder={
                inputModes.find((mode) => mode.id === inputKind)?.placeholder
              }
              maxLength={MAX_INPUT_LENGTH}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={loading}
              aria-invalid={!!error}
              aria-describedby={`input-hint${error ? " input-error" : ""}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  form.current?.requestSubmit();
                }
              }}
            />
            <span className={styles.characterCount}>
              {input.length.toLocaleString()}{" "}
              <span>/ {MAX_INPUT_LENGTH.toLocaleString()}</span>
            </span>
          </div>
          {error && (
            <p id="input-error" className={styles.formError} role="alert">
              <Icon name="error" size={16} />
              {error}
            </p>
          )}
          <div className={styles.inputActions}>
            <span id="input-hint" className={styles.inputHint}>
              <Icon name="code" size={16} />
              {loading
                ? "Finding your next clear step…"
                : "Error + context = a better starting point"}
            </span>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={loading || !ready}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Analyzing…
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={18} />
                  Analyze Error
                  <Icon name="arrow" size={17} />
                </>
              )}
            </button>
          </div>
          <div className={styles.editorFooter}>
            <span>
              <Icon name="lock" size={12} />
              History is saved in this browser
            </span>
            <span>
              <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to analyze
            </span>
          </div>
        </form>
        <div className={styles.examples}>
          <span>Try an example</span>
          <div>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                disabled={loading}
                onClick={() => {
                  setInput(example.input);
                  setInputKind("error");
                  setError(null);
                  textarea.current?.focus();
                }}
              >
                <Icon name="bolt" size={12} />
                {example.label}
              </button>
            ))}
          </div>
        </div>
        <section
          className={styles.recentSection}
          aria-labelledby="recent-title"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="recent-title">
                <Icon name="history" size={19} />
                Recent debugging sessions
              </h2>
              <p>Pick up where you left off.</p>
            </div>
            <Link href="/history" className={styles.textLink}>
              View all
              <Icon name="arrow" size={15} />
            </Link>
          </div>
          {!ready ? (
            <SessionsLoading />
          ) : sessions.length > 0 ? (
            <SessionList sessions={sessions.slice(0, 3)} />
          ) : (
            <EmptyState
              title="Your next breakthrough starts here"
              description="Analyze an error and your session will appear here."
            />
          )}
        </section>
      </div>
      <aside className={styles.insightsRail} aria-label="How DevFix helps">
        <div className={styles.railHeading}>
          <span className={styles.eyebrow}>FROM ERROR TO INSIGHT</span>
          <h2>
            Get unstuck.
            <br />
            <span>Keep building.</span>
          </h2>
        </div>
        <div className={`${styles.featureCard} ${styles.featureCyan}`}>
          <span className={styles.featureIcon}>
            <Icon name="target" size={24} />
          </span>
          <h3>Find the root cause</h3>
          <p>Understand what went wrong and where to look first.</p>
          <span className={styles.featureNumber}>01</span>
        </div>
        <div className={`${styles.featureCard} ${styles.featureBlue}`}>
          <span className={styles.featureIcon}>
            <Icon name="tool" size={24} />
          </span>
          <h3>Make the right fix</h3>
          <p>Get practical suggestions and code you can work with.</p>
          <span className={styles.featureNumber}>02</span>
        </div>
        <div className={`${styles.featureCard} ${styles.featurePurple}`}>
          <span className={styles.featureIcon}>
            <Icon name="book" size={24} />
          </span>
          <h3>Learn as you go</h3>
          <p>Know why the fix works, so the next error feels easier.</p>
          <span className={styles.featureNumber}>03</span>
        </div>
        <div className={styles.demoNote}>
          <Icon name="bolt" size={17} />
          <div>
            <strong>A little context goes a long way</strong>
            <p>
              Include the error and nearby code for a clearer starting point.
              Review each suggestion before applying it.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
