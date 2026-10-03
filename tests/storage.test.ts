import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSessions, getSessionSnapshot, saveSession, STORAGE_KEY, subscribeSessions } from "../lib/session-storage";
import { createSampleSessions, createSession } from "../lib/mock-analysis";
import { analysis, input } from "./fixtures";

test("existing history, API results, bounded storage, cross-tab updates, and memory fallback", () => {
  const values = new Map<string, string>([[STORAGE_KEY, JSON.stringify(createSampleSessions())]]);
  const events = new Map<string, (event: { key: string }) => void>();
  let blocked = false;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem(key: string) { if (blocked) throw new Error("Blocked"); return values.get(key) ?? null; },
      setItem(key: string, value: string) { if (blocked) throw new Error("Full"); values.set(key, value); },
    },
    addEventListener(name: string, callback: (event: { key: string }) => void) { events.set(name, callback); },
    removeEventListener(name: string) { events.delete(name); },
  } });
  const unsubscribe = subscribeSessions(() => {});
  try {
    assert.equal(getSessionSnapshot().sessions.length, 3);
    assert.equal(getSessionSnapshot().ready, true);
    const session = createSession(input, "error", { analysis });
    saveSession(session);
    assert.deepEqual(getSessionSnapshot().sessions[0].analysis, analysis);
    saveSession({ ...session, title: "Updated session" });
    assert.equal(getSessionSnapshot().sessions.length, 4);
    assert.equal(getSessionSnapshot().sessions[0].title, "Updated session");
    for (let i = 0; i < 35; i++) saveSession(createSession(input, "error", { id: `session-${i}`, analysis }));
    assert.equal(getSessionSnapshot().sessions.length, 30);
    assert.equal(JSON.parse(values.get(STORAGE_KEY) ?? "").length, 30);
    values.set(STORAGE_KEY, JSON.stringify([session]));
    events.get("storage")?.({ key: STORAGE_KEY });
    assert.equal(getSessionSnapshot().sessions.length, 1);
    values.set(STORAGE_KEY, JSON.stringify([{ ...session, analysis: { ...analysis, actionPlan: ["one"] } }]));
    events.get("storage")?.({ key: STORAGE_KEY });
    assert.match(getSessionSnapshot().storageError ?? "", /could not be loaded/);
    clearSessions();
    events.get("storage")?.({ key: STORAGE_KEY });
    assert.deepEqual(getSessionSnapshot().sessions, []);
    assert.equal(values.get(STORAGE_KEY), "[]");
    blocked = true;
    saveSession(session);
    assert.equal(getSessionSnapshot().sessions.length, 1);
    assert.match(getSessionSnapshot().storageError ?? "", /storage is unavailable/);
  } finally {
    unsubscribe();
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
