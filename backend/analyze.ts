import { AnalysisValidationError, parseAnalysisRequest, parseAnalysisResponse } from "../lib/analysis-contract";
import { analyzeWithBedrock, BedrockConfigurationError } from "./bedrock";

export const BACKEND_TIMEOUT_MS = 20_000;
// Allow JSON's worst-case six-byte escaping of each of 5,000 input characters.
const MAX_BODY_BYTES = 32_000;

interface HttpEvent {
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  requestContext?: { http?: { method?: string }; requestId?: string };
}

function reply(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function failure(status: number, code: string, message: string) {
  return reply(status, { error: { code, message } });
}

export function createAnalyzeHandler(
  analyze: typeof analyzeWithBedrock = analyzeWithBedrock,
  timeoutMs = BACKEND_TIMEOUT_MS,
) {
  return async (event: HttpEvent, context?: { getRemainingTimeInMillis(): number }) => {
    if (event.requestContext?.http?.method !== "POST")
      return failure(405, "METHOD_NOT_ALLOWED", "Use POST to analyze an error.");
    const contentType = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === "content-type")?.[1];
    if (!contentType || contentType.split(";")[0].trim().toLowerCase() !== "application/json")
      return failure(415, "INVALID_INPUT", "Send your input as JSON.");
    let request;
    try {
      if (typeof event.body !== "string") throw new AnalysisValidationError("Provide a JSON request body.");
      if (event.body.length > MAX_BODY_BYTES * 2)
        return failure(413, "INVALID_INPUT", "The input is too large.");
      const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES)
        return failure(413, "INVALID_INPUT", "The input is too large.");
      request = parseAnalysisRequest(JSON.parse(body));
    } catch (cause) {
      return failure(400, "INVALID_INPUT", cause instanceof AnalysisValidationError ? cause.message : "Provide a valid JSON request body.");
    }
    const duration = Math.min(timeoutMs, BACKEND_TIMEOUT_MS, (context?.getRemainingTimeInMillis() ?? 25_000) - 1_500);
    if (!Number.isFinite(duration) || duration <= 0)
      return failure(504, "TIMEOUT", "Analysis took too long. Please try again.");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new DOMException("Analysis timed out", "TimeoutError"));
      }, duration);
    });
    try {
      const response = await Promise.race([
        deadline,
        analyze(request.input, { inputKind: request.inputKind, signal: controller.signal }),
      ]);
      return reply(200, parseAnalysisResponse(response));
    } catch (cause) {
      if (controller.signal.aborted)
        return failure(504, "TIMEOUT", "Analysis took too long. Please try again.");
      if (cause instanceof BedrockConfigurationError)
        return failure(503, "NOT_CONFIGURED", "Analysis is not configured yet. Please try again later.");
      const throttled = cause instanceof Error && cause.name === "ThrottlingException";
      // Log no inputs, model output, raw exception messages, or credentials.
      console.warn(JSON.stringify({ event: "analysis_failed", code: throttled ? "RATE_LIMITED" : "UNAVAILABLE" }));
      return failure(throttled ? 429 : 503, throttled ? "RATE_LIMITED" : "UNAVAILABLE",
        throttled ? "Too many analyses at once. Please wait a moment and try again." : "Analysis is temporarily unavailable. Please try again.");
    } finally {
      clearTimeout(timer!);
    }
  };
}

export const handler = createAnalyzeHandler();
