import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAnalysisRequest, parseAnalysisResponse, AnalysisValidationError } from "../lib/analysis-contract";
import { analyzeError, AnalysisClientError } from "../lib/analyze-client";
import { analysis, input } from "./fixtures";

test("request accepts all three input types and the exact character limit", () => {
  for (const inputKind of ["error", "code", "logs"])
    assert.deepEqual(parseAnalysisRequest({ input: " x ", inputKind }), { input: "x", inputKind });
  assert.equal(parseAnalysisRequest({ input: "x".repeat(5000), inputKind: "code" }).input.length, 5000);
});

test("request rejects empty, malformed, excessive, and invalid-kind input", () => {
  for (const value of [null, [], {}, { input: 1, inputKind: "error" },
    { input: " \n ", inputKind: "error" }, { input, inputKind: "chat" },
    { input: "x".repeat(5001), inputKind: "error" }, { input: " ".repeat(5001), inputKind: "error" }])
    assert.throws(() => parseAnalysisRequest(value), AnalysisValidationError);
});

test("response validates exactly three nonempty steps and removes extra fields", () => {
  assert.deepEqual(parseAnalysisResponse({ ...analysis, rootCause: ` ${analysis.rootCause} `, unexpected: "private detail" }), analysis);
  for (const actionPlan of [[], ["a"], ["a", "b"], ["a", "b", "c", "d"], ["a", "", "c"], ["a", 2, "c"]])
    assert.throws(() => parseAnalysisResponse({ ...analysis, actionPlan }), AnalysisValidationError);
  for (const value of [null, { ...analysis, rootCause: "" }, { ...analysis, explanation: 1 },
    { ...analysis, suggestedFix: "x".repeat(4001) }, { ...analysis, code: "x".repeat(8001) }])
    assert.throws(() => parseAnalysisResponse(value), AnalysisValidationError);
});

test("mock mode keeps realistic analysis and never uses fetch", async () => {
  const session = await analyzeError(input, "error", new AbortController().signal, {
    mode: "mock",
    fetch: async () => { throw new Error("Mock mode must not use the network"); },
  });
  assert.equal(session.kind, "type");
  assert.equal(session.isSample, false);
  assert.equal(session.analysis.actionPlan.length, 3);
  assert.match(session.analysis.rootCause, /undefined/);
});

test("API mode posts the contract without credentials and preserves the server result", async () => {
  const session = await analyzeError(` ${input} `, "logs", new AbortController().signal, {
    mode: "api", apiUrl: "https://example.com/api/analyze",
    fetch: async (url, options) => {
      assert.equal(url, "https://example.com/api/analyze");
      assert.equal(options?.method, "POST");
      assert.equal(options?.credentials, "omit");
      assert.equal(options?.cache, "no-store");
      assert.deepEqual(JSON.parse(String(options?.body)), { input, inputKind: "logs" });
      assert.equal(new Headers(options?.headers).get("content-type"), "application/json");
      return Response.json({ ...analysis, ignored: "extra" });
    },
  });
  assert.deepEqual(session.analysis, analysis);
  assert.equal(session.inputKind, "logs");
  assert.equal(session.input, input);
});

for (const [status, code] of [[429, "RATE_LIMITED"], [504, "TIMEOUT"], [503, "UNAVAILABLE"], [403, "UNAVAILABLE"]] as const)
  test(`API ${status} returns a safe error with no mock fallback`, async () => {
    await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
      mode: "api", apiUrl: "https://example.com/api/analyze",
      fetch: async () => new Response("sensitive diagnostic", { status }),
    }), (error: unknown) => error instanceof AnalysisClientError && error.code === code && !error.message.includes("sensitive"));
  });

test("API rejects malformed JSON and invalid successful responses", async () => {
  for (const body of ["not json", JSON.stringify({ ...analysis, actionPlan: ["one"] })])
    await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
      mode: "api", apiUrl: "https://example.com/api/analyze", fetch: async () => new Response(body),
    }), (error: unknown) => error instanceof AnalysisClientError && error.code === "INVALID_RESPONSE");
});

test("client deadline rejects even if fetch ignores abort", async () => {
  let signal: AbortSignal | null | undefined;
  await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
    mode: "api", apiUrl: "http://localhost:3002/api/analyze", timeoutMs: 10,
    fetch: async (_, options) => {
      signal = options?.signal;
      return new Promise<Response>(() => {});
    },
  }), (error: unknown) => error instanceof AnalysisClientError && error.code === "TIMEOUT");
  assert.equal(signal?.aborted, true);
});

test("client deadline covers reading a stalled response body", async () => {
  await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
    mode: "api", apiUrl: "https://example.com/api/analyze", timeoutMs: 10,
    fetch: async () => new Response(new ReadableStream({ start() {} })),
  }), (error: unknown) => error instanceof AnalysisClientError && error.code === "TIMEOUT");
});

test("client supports cancellation before and during an analysis", async () => {
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(analyzeError(input, "error", cancelled.signal), { name: "AbortError" });
  const pending = new AbortController();
  const result = analyzeError(input, "error", pending.signal, { mode: "mock" });
  pending.abort();
  await assert.rejects(result, { name: "AbortError" });
});

test("API rejects insecure/nonconfigured endpoints before any network work", async () => {
  for (const apiUrl of ["", "/api/analyze", "http://example.com/api/analyze", "https://user:password@example.com", "https://example.com/#fragment"])
    await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
      mode: "api", apiUrl, fetch: async () => { throw new Error("Unexpected fetch"); },
    }), (error: unknown) => error instanceof AnalysisClientError && error.code === "NOT_CONFIGURED");
});

test("network failures do not expose raw exception messages", async () => {
  await assert.rejects(analyzeError(input, "error", new AbortController().signal, {
    mode: "api", apiUrl: "https://example.com/api/analyze",
    fetch: async () => { throw new Error("sensitive diagnostic"); },
  }), (error: unknown) => error instanceof AnalysisClientError && error.code === "NETWORK" && !error.message.includes("sensitive"));
});
