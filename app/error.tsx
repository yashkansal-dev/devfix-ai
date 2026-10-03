"use client";

import { EmptyState } from "@/components/empty-state";
import styles from "@/components/devfix.module.css";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon="error"
      title="Something interrupted your session"
      description="Your saved history is still in this browser. Try loading this page again."
    >
      <button type="button" className={styles.primaryButton} onClick={reset}>
        Try again
      </button>
    </EmptyState>
  );
}
