"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";
import { useSessions } from "./use-sessions";
import styles from "./devfix.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sessions, ready, storageError } = useSessions();
  const [lightTheme, setLightTheme] = useState(false);
  const section = pathname.startsWith("/history")
    ? "History"
    : pathname.startsWith("/analysis")
      ? "Analysis"
      : "Overview";

  function toggleTheme() {
    const next = !lightTheme;
    document.documentElement.dataset.theme = next ? "light" : "dark";
    setLightTheme(next);
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <aside className={styles.sidebar} aria-label="Workspace sidebar">
        <Link href="/" className={styles.brand} aria-label="DevFix AI home">
          <span className={styles.brandIcon}>
            <Icon name="code" size={23} />
          </span>
          <span>
            DevFix <span className={styles.brandAccent}>AI</span>
          </span>
        </Link>
        <span className={styles.navLabel}>WORKSPACE</span>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link
            href="/"
            className={`${styles.navItem} ${section !== "History" ? styles.navActive : ""}`}
            aria-current={section === "Overview" ? "page" : undefined}
          >
            <Icon name="home" />
            <span>Home</span>
          </Link>
          <Link
            href="/history"
            className={`${styles.navItem} ${section === "History" ? styles.navActive : ""}`}
            aria-current={section === "History" ? "page" : undefined}
          >
            <Icon name="history" />
            <span>History</span>
            {ready && sessions.length > 0 && (
              <span className={styles.navCount}>{sessions.length}</span>
            )}
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarCard}>
            <span className={styles.sidebarSparkle}>
              <Icon name="sparkles" size={24} />
            </span>
            <strong>A little less stuck.</strong>
            <p>Turn confusing errors into your next clear step.</p>
            <span className={styles.sidebarCardTag}>
              <span className={styles.statusDot} />
              Developer workspace
            </span>
          </div>
          <div className={styles.sidebarFooter}>
            <span className={styles.miniLogo}>D</span>
            <span>
              DevFix AI
              <span className={styles.version}>Hackathon MVP</span>
            </span>
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <Icon name="code" size={17} />
            <span>Workspace</span>
            <span className={styles.breadcrumbSlash}>/</span>
            <strong>{section}</strong>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.demoBadge}>
              <span className={styles.statusDot} />
              Debugging workspace
            </span>
            <button
              className={styles.themeButton}
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${lightTheme ? "dark" : "light"} theme`}
              title={`Switch to ${lightTheme ? "dark" : "light"} theme`}
            >
              <Icon name={lightTheme ? "moon" : "sun"} size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" className={styles.main}>
          {storageError && (
            <div role="alert" className={styles.warning}>
              <Icon name="error" size={18} />
              <p>{storageError}</p>
            </div>
          )}
          {children}
        </main>
        <footer className={styles.pageFooter}>
          <span>Built for the moments when your code has other plans.</span>
          <span>
            DevFix AI <span className={styles.footerDot}>·</span> Hackathon MVP
          </span>
        </footer>
      </div>
    </div>
  );
}
