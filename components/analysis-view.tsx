"use client";

import Link from "next/link";
import { CodeBlock } from "./code-block";
import { EmptyState, SessionsLoading } from "./empty-state";
import { Icon } from "./icon";
import { useSessions } from "./use-sessions";
import styles from "./devfix.module.css";

export function AnalysisView({ sessionId }: { sessionId: string }) {
  const { sessions, ready, storageError } = useSessions();
  if (!ready) return <SessionsLoading />;
  const session = sessions.find((item) => item.id === sessionId);
  if (!session)
    return (
      <EmptyState
        icon="search"
        title="This session isn't here"
        description="It may have been cleared, or saved in another browser. Start a new analysis to get back on track."
      >
        <Link className={styles.primaryButton} href="/">
          Analyze another error
          <Icon name="arrow" size={17} />
        </Link>
      </EmptyState>
    );
  const { analysis } = session;
  return (
    <div className={styles.analysisPage}>
      <Link href="/" className={styles.backLink}>
        <Icon name="back" size={16} />
        Back to Home
      </Link>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>A CLEARER WAY FORWARD</span>
          <h1>
            Analysis result<span className={styles.headingDot}>.</span>
          </h1>
          <p>Here’s what happened, and what to do next.</p>
        </div>
        <div className={styles.analysisMeta}>
          <span className={styles.successBadge}>
            <Icon name="check" size={13} />
            Analysis complete
          </span>
          <time dateTime={session.createdAt}>
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(session.createdAt))}
          </time>
        </div>
      </div>
      <div className={styles.analysisNotice}>
        <Icon name="sparkles" size={17} />
        <span>
          {session.isSample ? "Sample session" : "Debugging guidance"}
          <span className={styles.noticeDivider}>/</span>
          Review and adapt the suggested fix to your code.
        </span>
        <span className={styles.languageTag}>{session.language}</span>
      </div>
      <section
        aria-labelledby="your-error-title"
        className={styles.originalError}
      >
        <h2 id="your-error-title">Your input</h2>
        <CodeBlock
          code={session.input}
          language={
            session.inputKind === "code"
              ? "Code snippet"
              : session.inputKind === "logs"
                ? "Logs & stack trace"
                : "Error message"
          }
          isError
        />
      </section>
      <div className={styles.analysisGrid}>
        <section
          className={`${styles.analysisCard} ${styles.rootCause}`}
          aria-labelledby="root-cause-title"
        >
          <div className={styles.analysisCardHeading}>
            <span>
              <Icon name="target" size={21} />
            </span>
            <div>
              <span className={styles.cardEyebrow}>THE DIAGNOSIS</span>
              <h2 id="root-cause-title">Root Cause</h2>
            </div>
            <span className={styles.cardNumber}>01</span>
          </div>
          <p>{analysis.rootCause}</p>
        </section>
        <section
          className={`${styles.analysisCard} ${styles.suggestedFix}`}
          aria-labelledby="suggested-fix-title"
        >
          <div className={styles.analysisCardHeading}>
            <span>
              <Icon name="tool" size={21} />
            </span>
            <div>
              <span className={styles.cardEyebrow}>THE SOLUTION</span>
              <h2 id="suggested-fix-title">Suggested Fix</h2>
            </div>
            <span className={styles.cardNumber}>02</span>
          </div>
          <p>{analysis.suggestedFix}</p>
          {analysis.code && (
            <CodeBlock
              code={analysis.code}
              language={analysis.codeLanguage ?? session.language}
            />
          )}
        </section>
        <section
          className={`${styles.analysisCard} ${styles.explanation}`}
          aria-labelledby="explanation-title"
        >
          <div className={styles.analysisCardHeading}>
            <span>
              <Icon name="book" size={21} />
            </span>
            <div>
              <span className={styles.cardEyebrow}>THE WHY</span>
              <h2 id="explanation-title">Explanation</h2>
            </div>
            <span className={styles.cardNumber}>03</span>
          </div>
          <p>{analysis.explanation}</p>
        </section>
        <section
          className={`${styles.analysisCard} ${styles.actionPlan}`}
          aria-labelledby="action-plan-title"
        >
          <div className={styles.analysisCardHeading}>
            <span>
              <Icon name="plan" size={21} />
            </span>
            <div>
              <span className={styles.cardEyebrow}>YOUR NEXT MOVES</span>
              <h2 id="action-plan-title">Action Plan</h2>
            </div>
            <span className={styles.cardNumber}>04</span>
          </div>
          <ol className={styles.actionSteps}>
            {analysis.actionPlan.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className={styles.analysisBottom}>
        <span>
          <Icon name="history" size={17} />
          {storageError
            ? "Kept in this tab for now"
            : "Saved to your browser history"}
        </span>
        <Link href="/" className={styles.primaryButton}>
          <Icon name="sparkles" size={17} />
          Analyze another error
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </div>
  );
}
