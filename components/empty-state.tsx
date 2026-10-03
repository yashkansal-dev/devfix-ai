import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import styles from "./devfix.module.css";

export function EmptyState({
  title,
  description,
  icon = "history",
  children,
}: {
  title: string;
  description: string;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function SessionsLoading() {
  return (
    <div
      className={styles.sessionSkeleton}
      role="status"
      aria-label="Loading debugging sessions"
    >
      <span />
      <span />
      <span />
      <span className={styles.srOnly}>Loading debugging sessions…</span>
    </div>
  );
}
