import type { AnalysisResponse } from "../lib/analysis-contract";

export const analysis: AnalysisResponse = {
  rootCause: "The users value is undefined when rendering starts.",
  suggestedFix: "Initialize users to an empty array before calling map.",
  explanation: "The request has not completed on the first render.",
  actionPlan: ["Inspect the response shape.", "Initialize the array.", "Test loading and empty responses."],
  code: "const [users, setUsers] = useState<User[]>([]);",
  codeLanguage: "typescript",
};

export const input = "TypeError: Cannot read properties of undefined (reading 'map')";
