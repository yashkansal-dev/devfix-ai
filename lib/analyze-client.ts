import { parseAnalysisRequest, parseAnalysisResponse } from "./analysis-contract";
import type { DebugSession, InputKind } from "./debug-types";
import { analyzeLocally, createSession } from "./mock-analysis";

export const ANALYSIS_TIMEOUT_MS = 25_000;

export class AnalysisClientError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AnalysisClientError";
  }
}

interface ClientOptions {
  mode?: string;
  apiUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

function endpoint(value: string): string {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.hash ||
        (url.protocol !== "https:" && !(local && url.protocol === "http:")))
      throw new Error("Invalid endpoint");
    return url.href;
  } catch {
    throw new AnalysisClientError("Analysis is not configured yet. Please try again later.", "NOT_CONFIGURED");
  }
}

export async function analyzeError(
  input: string,
  inputKind: InputKind,
  signal: AbortSignal,
  options: ClientOptions = {},
): Promise<DebugSession> {
  signal.throwIfAborted();
  const request = parseAnalysisRequest({ input, inputKind });
  const mode = options.mode ?? process.env.DEVFIX_ANALYSIS_MODE ?? "mock";
  if (mode !== "mock" && mode !== "api")
    throw new AnalysisClientError("Analysis is not configured yet. Please try again later.", "NOT_CONFIGURED");
  const apiUrl = mode === "api" ? endpoint(options.apiUrl ?? process.env.DEVFIX_API_URL ?? "") : "";
  const timeoutMs = Math.min(options.timeoutMs ?? ANALYSIS_TIMEOUT_MS, ANALYSIS_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new AnalysisClientError("Analysis is not configured yet. Please try again later.", "NOT_CONFIGURED");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let onAbort: () => void;
  const deadline = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new DOMException("Analysis cancelled", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new AnalysisClientError("Analysis took too long. Please try again.", "TIMEOUT"));
    }, timeoutMs);
  });
  const run = async () => {
    if (mode === "mock") {
      const session = await analyzeLocally(request.input, request.inputKind, controller.signal);
      return { ...session, analysis: parseAnalysisResponse(session.analysis) };
    }
    const response = await (options.fetch ?? fetch)(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 429)
        throw new AnalysisClientError("Too many analyses at once. Please wait a moment and try again.", "RATE_LIMITED");
      if (response.status === 504)
        throw new AnalysisClientError("Analysis took too long. Please try again.", "TIMEOUT");
      throw new AnalysisClientError("Analysis is temporarily unavailable. Please try again.", "UNAVAILABLE");
    }
    let analysis;
    try {
      analysis = parseAnalysisResponse(await response.json());
    } catch {
      throw new AnalysisClientError("The analysis response could not be read. Please try again.", "INVALID_RESPONSE");
    }
    controller.signal.throwIfAborted();
    return createSession(request.input, request.inputKind, { analysis });
  };
  try {
    return await Promise.race([deadline, run()]);
  } catch (cause) {
    if (signal.aborted) throw new DOMException("Analysis cancelled", "AbortError");
    if (cause instanceof AnalysisClientError) throw cause;
    throw new AnalysisClientError("Could not reach the analysis service. Check your connection and try again.", "NETWORK");
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", onAbort!);
  }
}
