"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSessions,
} from "@/lib/session-storage";

export function useSessions() {
  return useSyncExternalStore(
    subscribeSessions,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
}
