"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_SESSIONS } from "@/lib/debug-types";
import { clearSessions } from "@/lib/session-storage";
import { EmptyState, SessionsLoading } from "./empty-state";
import { Icon } from "./icon";
import { SessionList } from "./session-list";
import { useSessions } from "./use-sessions";
import styles from "./devfix.module.css";

export function HistoryView() {
  const { sessions, ready } = useSessions();
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const filtered = sessions.filter((session) =>
    `${session.title} ${session.input} ${session.language}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className={styles.historyPage}>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>YOUR DEBUGGING TRAIL</span>
          <h1>
            Session history<span className={styles.headingDot}>.</span>
          </h1>
          <p>A little context for the next time something breaks.</p>
        </div>
        <Link href="/" className={styles.primaryButton}>
          <Icon name="sparkles" size={16} />
          New analysis
          <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className={styles.historyToolbar}>
        <div className={styles.historyCount}>
          <Icon name="history" size={19} />
          <strong>Debugging sessions</strong>
          <span>{ready ? sessions.length : "—"}</span>
        </div>
        <div className={styles.historyControls}>
          <label className={styles.searchField}>
            <Icon name="search" size={16} />
            <span className={styles.srOnly}>Search debugging sessions</span>
            <input
              type="search"
              placeholder="Search sessions…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!ready || sessions.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Icon name="trash" size={15} />
            Clear all
          </button>
        </div>
      </div>
      {confirmClear && sessions.length > 0 && (
        <div className={styles.clearConfirmation} role="alert">
          <p>Clear all {sessions.length} sessions from this browser?</p>
          <div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => {
                clearSessions();
                setConfirmClear(false);
                setQuery("");
              }}
            >
              Clear sessions
            </button>
          </div>
        </div>
      )}
      {!ready ? (
        <SessionsLoading />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="A fresh start"
          description="Your debugging sessions will live here. Paste an error to create your first one."
        >
          <Link href="/" className={styles.primaryButton}>
            Analyze an error
            <Icon name="arrow" size={17} />
          </Link>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching sessions"
          description="Try another error message, package name, or language."
        >
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </EmptyState>
      ) : (
        <SessionList sessions={filtered} />
      )}
      <div className={styles.historyFootnote}>
        <Icon name="lock" size={14} />
        <p>
          Stored only in this browser. Your {MAX_SESSIONS} most recent sessions
          are kept; clearing browser data removes them.
        </p>
      </div>
    </div>
  );
}
