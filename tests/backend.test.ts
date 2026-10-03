import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnalyzeHandler } from "../backend/analyze";
import { analyzeWithBedrock, BedrockConfigurationError, MAX_OUTPUT_TOKENS } from "../backend/bedrock";
import { analysis, input } from "./fixtures";

const event = (body: unknown = { input, inputKind: "error" }) => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json; charset=utf-8" },
  requestContext: { http: { method: "POST" } },
});

test("handler returns the shared response without wrapper or extra provider fields", async () => {
  const result = await createAnalyzeHandler(async (text, options) => {
    assert.equal(text, input);
    assert.equal(options?.inputKind, "error");
    assert.ok(options?.signal);
    return { ...analysis, extra: "removed" };
  })(event());
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), analysis);
  assert.equal(result.headers["cache-control"], "no-store");
});

test("handler validates input before calling the provider", async () => {
  let calls = 0;
  const handle = createAnalyzeHandler(async () => { calls++; return analysis; });
  for (const body of [{ input: "", inputKind: "error" }, { input: "x".repeat(5001), inputKind: "code" },
    { input, inputKind: "invalid" }, null])
    assert.equal((await handle(event(body))).statusCode, 400);
  assert.equal((await handle({ ...event(), body: "{broken" })).statusCode, 400);
  assert.equal((await handle({ ...event(), body: undefined })).statusCode, 400);
  assert.equal((await handle({ ...event(), body: "x".repeat(48001) })).statusCode, 413);
  assert.equal(calls, 0);
});

test("handler accepts base64, Unicode, and exactly 5000 characters", async () => {
  const handle = createAnalyzeHandler(async () => analysis);
  const original = event({ input: "字".repeat(5000), inputKind: "code" });
  assert.equal((await handle(original)).statusCode, 200);
  assert.equal((await handle({ ...original, body: Buffer.from(original.body).toString("base64"), isBase64Encoded: true })).statusCode, 200);
  assert.equal((await handle(event({ input: "\u0000".repeat(5000), inputKind: "logs" }))).statusCode, 200);
});

test("handler rejects other methods and non-JSON content types", async () => {
  const handle = createAnalyzeHandler(async () => analysis);
  assert.equal((await handle({ ...event(), requestContext: { http: { method: "GET" } } })).statusCode, 405);
  assert.equal((await handle({ ...event(), headers: { "content-type": "text/plain" } })).statusCode, 415);
});

test("handler enforces a deadline even when a provider ignores cancellation", async () => {
  let signal: AbortSignal | undefined;
  const result = await createAnalyzeHandler(async (_, options) => {
    signal = options?.signal;
    return new Promise(() => {});
  }, 10)(event());
  assert.equal(result.statusCode, 504);
  assert.equal(signal?.aborted, true);
});

test("handler leaves time to return a response before Lambda expires", async () => {
  let calls = 0;
  const result = await createAnalyzeHandler(async () => { calls++; return analysis; })(event(), { getRemainingTimeInMillis: () => 1000 });
  assert.equal(result.statusCode, 504);
  assert.equal(calls, 0);
});

test("handler errors and logs do not reveal provider messages or user input", async () => {
  const messages: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => messages.push(message);
  try {
    for (const [name, status, code] of [["AccessDeniedException", 503, "UNAVAILABLE"], ["ThrottlingException", 429, "RATE_LIMITED"]] as const) {
      const result = await createAnalyzeHandler(async () => {
        const error = new Error(`sensitive diagnostic: ${input}`);
        error.name = name;
        throw error;
      })(event());
      assert.equal(result.statusCode, status);
      assert.equal(JSON.parse(result.body).error.code, code);
      assert.ok(!result.body.includes("sensitive"));
    }
    assert.ok(messages.every((message) => !message.includes(input) && !message.includes("sensitive")));
    const invalid = await createAnalyzeHandler(async () => ({ ...analysis, actionPlan: ["one"] }) as unknown as typeof analysis)(event());
    assert.equal(invalid.statusCode, 503);
  } finally {
    console.warn = original;
  }
});

test("handler safely reports inference not configured", async () => {
  const result = await createAnalyzeHandler(async () => { throw new BedrockConfigurationError(); })(event());
  assert.equal(result.statusCode, 503);
  assert.equal(JSON.parse(result.body).error.code, "NOT_CONFIGURED");
});

test("Bedrock adapter uses Converse with bounded output and an injected SDK stub", async () => {
  const result = await analyzeWithBedrock(input, {
    enabled: true, region: "ap-south-1", modelId: "mistral.ministral-3-3b-instruct",
    send: async (command, options) => {
      assert.equal(command.input.modelId, "mistral.ministral-3-3b-instruct");
      assert.equal(command.input.inferenceConfig?.maxTokens, MAX_OUTPUT_TOKENS);
      assert.equal(MAX_OUTPUT_TOKENS, 1024);
      assert.deepEqual(JSON.parse(command.input.messages?.[0].content?.[0].text ?? ""), { input, inputKind: "error" });
      assert.ok(options.abortSignal);
      return { $metadata: {}, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, metrics: { latencyMs: 1 },
        stopReason: "end_turn", output: { message: { role: "assistant", content: [{ text: JSON.stringify(analysis) }] } } };
    },
  });
  assert.deepEqual(result, analysis);
});

test("Bedrock adapter prevents calls when disabled, out of Region, or using an unapproved model", async () => {
  let calls = 0;
  const send = async () => { calls++; throw new Error("Unexpected SDK call"); };
  for (const options of [
    { enabled: false, region: "ap-south-1", modelId: "mistral.ministral-3-3b-instruct" },
    { enabled: true, region: "us-east-1", modelId: "mistral.ministral-3-3b-instruct" },
    { enabled: true, region: "ap-south-1", modelId: "unapproved-large-model" },
  ]) await assert.rejects(analyzeWithBedrock(input, { ...options, send }), BedrockConfigurationError);
  assert.equal(calls, 0);
});

test("Bedrock adapter rejects truncated and malformed model output", async () => {
  for (const [stopReason, text] of [["max_tokens", JSON.stringify(analysis)], ["end_turn", "not json"],
    ["end_turn", JSON.stringify({ ...analysis, actionPlan: ["one"] })]] as const)
    await assert.rejects(analyzeWithBedrock(input, {
      enabled: true, region: "ap-south-1", modelId: "mistral.ministral-3-3b-instruct",
      send: async () => ({ $metadata: {}, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, metrics: { latencyMs: 1 },
        stopReason, output: { message: { role: "assistant", content: [{ text }] } } }),
    }));
});
