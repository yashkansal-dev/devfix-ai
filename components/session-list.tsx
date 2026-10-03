import Link from "next/link";
import type { DebugSession, ErrorKind } from "@/lib/debug-types";
import { Icon, type IconName } from "./icon";
import styles from "./devfix.module.css";

const sessionIcons: Record<ErrorKind, IconName> = {
  type: "target",
  module: "code",
  connection: "database",
  cors: "logs",
  auth: "lock",
  syntax: "code",
  general: "error",
};

export function SessionList({ sessions }: { sessions: DebugSession[] }) {
  return (
    <ul className={styles.sessionList}>
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/analysis/?id=${encodeURIComponent(session.id)}`}
            className={styles.sessionRow}
          >
            <span className={`${styles.sessionIcon} ${styles[session.kind]}`}>
              <Icon name={sessionIcons[session.kind]} size={21} />
            </span>
            <span className={styles.sessionText}>
              <strong>{session.title}</strong>
              <span>
                {session.input
                  .split("\n")
                  .find((line, index) => index > 0 && line.trim())
                  ?.trim() ?? "View debugging analysis"}
              </span>
            </span>
            <span className={styles.sessionTags}>
              {session.isSample && (
                <span className={styles.sampleTag}>Sample</span>
              )}
              <span className={styles.languageTag}>{session.language}</span>
            </span>
            <time dateTime={session.createdAt} className={styles.sessionDate}>
              {new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
              }).format(new Date(session.createdAt))}
              <span>
                {new Intl.DateTimeFormat(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(session.createdAt))}
              </span>
            </time>
            <Icon name="chevron" size={16} className={styles.sessionChevron} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
