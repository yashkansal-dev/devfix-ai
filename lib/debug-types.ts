export const MAX_INPUT_LENGTH = 5_000;
export const MAX_SESSIONS = 30;

export type InputKind = "error" | "code" | "logs";
export type ErrorKind =
  | "type"
  | "module"
  | "connection"
  | "cors"
  | "auth"
  | "syntax"
  | "general";

export interface DebugAnalysis {
  rootCause: string;
  suggestedFix: string;
  explanation: string;
  actionPlan: [string, string, string];
  code?: string;
  codeLanguage?: string;
}

export interface DebugSession {
  id: string;
  title: string;
  input: string;
  inputKind: InputKind;
  createdAt: string;
  language: string;
  kind: ErrorKind;
  analysis: DebugAnalysis;
  isSample: boolean;
}
