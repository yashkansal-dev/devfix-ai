import type { CSSProperties } from "react";

export type IconName =
  | "code"
  | "home"
  | "history"
  | "arrow"
  | "back"
  | "chevron"
  | "sparkles"
  | "bolt"
  | "target"
  | "tool"
  | "book"
  | "error"
  | "logs"
  | "search"
  | "copy"
  | "check"
  | "trash"
  | "lock"
  | "database"
  | "plan"
  | "sun"
  | "moon";

const paths: Record<IconName, React.ReactNode> = {
  code: (
    <>
      <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      <path d="M20 2v4m-2-2h4" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
      <path d="m16 8 5-5m-4 0h4v4" />
    </>
  ),
  tool: (
    <path d="M14 6a5 5 0 0 0-6 6L3 17a2.8 2.8 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4Z" />
  ),
  book: (
    <>
      <path d="M12 6C9 3 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-7-1-10 2Zm0 0v15" />
    </>
  ),
  error: (
    <>
      <path d="M10.3 4.5 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </>
  ),
  logs: (
    <>
      <path d="M6 3h9l4 4v14H6ZM14 3v5h5M9 12h7m-7 4h7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M15 8V3H3v13h5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  plan: (
    <>
      <path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
};

export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
