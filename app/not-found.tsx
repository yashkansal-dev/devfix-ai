import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import styles from "@/components/devfix.module.css";

export default function NotFound() {
  return (
    <EmptyState
      icon="search"
      title="Nothing to debug here"
      description="This page doesn't exist. Head back to your workspace to start an analysis."
    >
      <Link href="/" className={styles.primaryButton}>
        Back to Home
      </Link>
    </EmptyState>
  );
}
