"use client";

import { useState } from "react";
import { Icon } from "./icon";
import styles from "./devfix.module.css";

export function CodeBlock({
  code,
  language,
  isError = false,
}: {
  code: string;
  language: string;
  isError?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }
  return (
    <div className={`${styles.codeBlock} ${isError ? styles.errorCode : ""}`}>
      <div className={styles.codeHeader}>
        <span>
          <Icon name={isError ? "error" : "code"} size={15} />
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${isError ? "original input" : "suggested code"}`}
        >
          <Icon name={copyStatus === "copied" ? "check" : "copy"} size={14} />
          {copyStatus === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-label={isError ? "Original error or code" : "Suggested fix code"}
      >
        <code>{code}</code>
      </pre>
      <span
        role="status"
        className={copyStatus === "failed" ? styles.copyError : styles.srOnly}
      >
        {copyStatus === "failed"
          ? "Copy unavailable. Select the code and copy it manually."
          : copyStatus === "copied"
            ? "Code copied to clipboard."
            : ""}
      </span>
    </div>
  );
}
