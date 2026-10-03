import { MAX_INPUT_LENGTH, type DebugAnalysis, type InputKind } from "./debug-types";

export interface AnalysisRequest {
  input: string;
  inputKind: InputKind;
}

export type AnalysisResponse = DebugAnalysis;

export class AnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAnalysisRequest(value: unknown): AnalysisRequest {
  if (!record(value) || typeof value.input !== "string")
    throw new AnalysisValidationError("Provide an error message, code snippet, or logs.");
  if (value.input.length > MAX_INPUT_LENGTH)
    throw new AnalysisValidationError("Keep your input under 5,000 characters.");
  const input = value.input.trim();
  if (!input)
    throw new AnalysisValidationError("Paste an error message, code snippet, or logs to get started.");
  if (value.inputKind !== "error" && value.inputKind !== "code" && value.inputKind !== "logs")
    throw new AnalysisValidationError("Choose error, code, or logs as the input type.");
  return { input, inputKind: value.inputKind };
}

function text(value: unknown, field: string, limit = 4_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new AnalysisValidationError(`Invalid analysis field: ${field}.`);
  return value.trim();
}

export function parseAnalysisResponse(value: unknown): AnalysisResponse {
  if (!record(value)) throw new AnalysisValidationError("Invalid analysis response.");
  if (!Array.isArray(value.actionPlan) || value.actionPlan.length !== 3)
    throw new AnalysisValidationError("Analysis must contain exactly three action steps.");
  const response: AnalysisResponse = {
    rootCause: text(value.rootCause, "rootCause"),
    suggestedFix: text(value.suggestedFix, "suggestedFix"),
    explanation: text(value.explanation, "explanation"),
    actionPlan: [
      text(value.actionPlan[0], "actionPlan", 1_000),
      text(value.actionPlan[1], "actionPlan", 1_000),
      text(value.actionPlan[2], "actionPlan", 1_000),
    ],
  };
  if (value.code !== undefined) response.code = text(value.code, "code", 8_000);
  if (value.codeLanguage !== undefined)
    response.codeLanguage = text(value.codeLanguage, "codeLanguage", 60);
  return response;
}

export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  try {
    parseAnalysisResponse(value);
    return true;
  } catch {
    return false;
  }
}
