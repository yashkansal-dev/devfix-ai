import {
  MAX_INPUT_LENGTH,
  MAX_SESSIONS,
  type DebugSession,
} from "./debug-types";
import { createSampleSessions } from "./mock-analysis";
import { isAnalysisResponse } from "./analysis-contract";

export const STORAGE_KEY = "devfix.sessions.v1";

export interface SessionSnapshot {
  sessions: DebugSession[];
  ready: boolean;
  storageError: string | null;
}

export const EMPTY_SNAPSHOT: SessionSnapshot = {
  sessions: [],
  ready: false,
  storageError: null,
};
let snapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSession(value: unknown): value is DebugSession {
  if (!isRecord(value) || !isRecord(value.analysis)) return false;
  return (
    typeof value.id === "string" &&
    /^[a-zA-Z0-9-]{1,80}$/.test(value.id) &&
    typeof value.title === "string" &&
    value.title.length <= 140 &&
    typeof value.input === "string" &&
    value.input.length <= MAX_INPUT_LENGTH &&
    ["error", "code", "logs"].includes(String(value.inputKind)) &&
    [
      "type",
      "module",
      "connection",
      "cors",
      "auth",
      "syntax",
      "general",
    ].includes(String(value.kind)) &&
    typeof value.language === "string" &&
    value.language.length <= 60 &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.isSample === "boolean" &&
    isAnalysisResponse(value.analysis)
  );
}

function emit() {
  listeners.forEach((listener) => listener());
}

function loadFromBrowser() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown =
      stored === null ? createSampleSessions() : JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isSession))
      throw new Error("Invalid history");
    const sessions = parsed.slice(0, MAX_SESSIONS);
    if (stored === null)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    snapshot = { sessions, ready: true, storageError: null };
  } catch {
    snapshot = {
      sessions: snapshot.sessions,
      ready: true,
      storageError:
        "Browser history could not be loaded. You can still analyze errors; new sessions will be kept here while this tab is open.",
    };
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) loadFromBrowser();
}

export function subscribeSessions(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  if (!snapshot.ready) loadFromBrowser();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSessionSnapshot() {
  return snapshot;
}

export function getServerSessionSnapshot() {
  return EMPTY_SNAPSHOT;
}

function persistSessions(sessions: DebugSession[]) {
  let storageError: string | null = null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    storageError =
      "Browser storage is unavailable or full. Changes are kept in this tab, but they may be lost after a refresh.";
  }
  snapshot = { sessions, ready: true, storageError };
  emit();
}

export function saveSession(session: DebugSession) {
  persistSessions(
    [
      session,
      ...snapshot.sessions.filter((item) => item.id !== session.id),
    ].slice(0, MAX_SESSIONS),
  );
}

export function clearSessions() {
  persistSessions([]);
}
