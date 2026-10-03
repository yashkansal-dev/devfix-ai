import {
  MAX_INPUT_LENGTH,
  type DebugAnalysis,
  type DebugSession,
  type ErrorKind,
  type InputKind,
} from "./debug-types";

interface AnalysisPattern {
  kind: ErrorKind;
  language: string;
  matches: (input: string) => boolean;
  analysis: DebugAnalysis;
}

export const EXAMPLES = [
  {
    label: "TypeError",
    input:
      "TypeError: Cannot read properties of undefined (reading 'map')\n    at UsersList (src/components/UsersList.tsx:15:23)\n\nconst [users, setUsers] = useState();\nreturn users.map((user) => <UserCard key={user.id} user={user} />);",
  },
  {
    label: "MongoDB connection",
    input:
      "MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017\n    at Topology.selectServer (node_modules/mongodb/lib/sdam/topology.js:327:38)\n\nawait mongoose.connect('mongodb://127.0.0.1:27017/devfix');",
  },
  {
    label: "JWT signature",
    input:
      "JsonWebTokenError: invalid signature\n    at verify (node_modules/jsonwebtoken/verify.js:171:19)\n\nconst token = jwt.sign(payload, process.env.JWT_SIGNING_SECRET);\nconst user = jwt.verify(token, process.env.JWT_VERIFY_SECRET);",
  },
  {
    label: "CORS issue",
    input:
      "Access to fetch at 'http://localhost:4000/api/users' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.\n\nfetch('http://localhost:4000/api/users', { credentials: 'include' });",
  },
  {
    label: "Module not found",
    input:
      "Module not found: Can't resolve 'react-router-dom'\n    at ./src/App.tsx:5:1\n\nimport { BrowserRouter } from 'react-router-dom';",
  },
] as const;

const patterns: AnalysisPattern[] = [
  {
    kind: "type",
    language: "JavaScript",
    matches: (input) =>
      /(?:undefined|null).*(?:reading\s*['"]map['"]|\.map)|(?:\.map).*not a function/i.test(
        input,
      ),
    analysis: {
      rootCause:
        "The value you call .map() on is not an array. In the sample, users starts as undefined, so the first render fails before any data can load.",
      suggestedFix:
        "Initialize list state with an empty array. Validate the API response before updating state, and handle loading separately from the list data.",
      explanation:
        "React renders once before an asynchronous request finishes. Array.prototype.map works only on arrays; undefined and null have no map method. An empty array renders an empty list safely. Checking Array.isArray also catches an unexpected API response shape.",
      actionPlan: [
        "Inspect the failing line and log the value being mapped, including the shape of the API response.",
        "Initialize the list as [] and accept only array values when updating it.",
        "Test the initial render, an empty response, and a failed request; show loading and error states explicitly.",
      ],
      code: "const [users, setUsers] = useState<User[]>([]);\n\n// After fetching the response:\nsetUsers(Array.isArray(data.users) ? data.users : []);\n\nreturn users.map((user) => (\n  <UserCard key={user.id} user={user} />\n));",
      codeLanguage: "TypeScript / React",
    },
  },
  {
    kind: "connection",
    language: "Node.js",
    matches: (input) =>
      /MongoServerSelectionError|(?:mongodb|mongoose|27017)[\s\S]*ECONNREFUSED|ECONNREFUSED[\s\S]*(?:27017|mongo)/i.test(
        input,
      ),
    analysis: {
      rootCause:
        "The application cannot reach the database server at the configured host and port. ECONNREFUSED commonly means nothing is listening there, or the connection is actively rejected.",
      suggestedFix:
        "Check that MongoDB is running and that the connection URI points to the correct host. In a container, localhost refers to that container, so use the database service name instead.",
      explanation:
        "A database connection first needs a reachable TCP endpoint. Retrying or increasing the timeout will not fix an incorrect host or a stopped database. Diagnose connectivity before checking credentials or query code.",
      actionPlan: [
        "Check the database process or container logs and confirm which port it listens on.",
        "Compare the connection URI with your runtime: localhost for the same machine, or the service hostname between containers.",
        "Retry a simple connection from the application's environment, then restart the app with the corrected configuration.",
      ],
      code: "// Use the actual host for your environment.\nconst uri = process.env.MONGODB_URI;\nif (!uri) throw new Error('MONGODB_URI is required');\n\nawait mongoose.connect(uri, {\n  serverSelectionTimeoutMS: 5000,\n});",
      codeLanguage: "JavaScript / Node.js",
    },
  },
  {
    kind: "auth",
    language: "Node.js",
    matches: (input) =>
      /JsonWebTokenError|jwt.*invalid signature|invalid signature.*jwt/i.test(
        input,
      ),
    analysis: {
      rootCause:
        "The token's signature does not match the key used to verify it. In the sample, signing and verification use two different environment variables that may contain different secrets.",
      suggestedFix:
        "For an HMAC token, use the same secret and algorithm for signing and verification. For an asymmetric token, verify with the public key that matches the signing private key.",
      explanation:
        "A JWT signature verifies that the token was issued by a holder of the expected key and has not changed. A mismatched key, unexpected algorithm, or modified token will fail verification. Decoding a token does not verify it.",
      actionPlan: [
        "Compare the configured signing and verification keys without printing secrets or full tokens in logs.",
        "Set an explicit allowed algorithm and validate the expected issuer and audience in your application.",
        "Issue a fresh token after updating the configuration, then test both valid and tampered tokens.",
      ],
      code: "const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is required');\n\nconst token = jwt.sign(payload, secret, {\n  algorithm: 'HS256',\n  expiresIn: '1h',\n});\n\nconst verified = jwt.verify(token, secret, {\n  algorithms: ['HS256'],\n});",
      codeLanguage: "JavaScript / Node.js",
    },
  },
  {
    kind: "cors",
    language: "HTTP",
    matches: (input) => /CORS|Access-Control-Allow-Origin/i.test(input),
    analysis: {
      rootCause:
        "The browser blocks a cross-origin response because the API does not return the required CORS headers for your frontend's origin.",
      suggestedFix:
        "Configure the API to allow your exact frontend origin and handle preflight OPTIONS requests. If you use cookies, also enable credentials; a wildcard origin cannot be used with credentialed requests.",
      explanation:
        "An origin includes protocol, hostname, and port, so localhost:3000 and localhost:4000 are different origins. CORS is enforced by browsers using the server's response headers. Setting mode: 'no-cors' returns an opaque response you cannot read and does not solve the issue.",
      actionPlan: [
        "Inspect the request and any OPTIONS preflight in the browser's Network panel.",
        "Add an exact origin allowlist to the API, including the required methods, headers, and credentials settings.",
        "Retest from the frontend and verify the response headers; ensure unapproved origins remain blocked.",
      ],
      code: "// Example response headers for a cookie-based local API:\nAccess-Control-Allow-Origin: http://localhost:3000\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\nAccess-Control-Allow-Headers: Content-Type\nVary: Origin",
      codeLanguage: "HTTP response headers",
    },
  },
  {
    kind: "module",
    language: "JavaScript",
    matches: (input) =>
      /module not found|cannot find module|can't resolve|ERR_MODULE_NOT_FOUND/i.test(
        input,
      ),
    analysis: {
      rootCause:
        "The module resolver cannot find an imported package or file. The package may be missing, the import path may be wrong, or the filename casing may differ.",
      suggestedFix:
        "Check the exact import against your package manifest or local file path. Install a missing package only if the project needs it. In a Next.js App Router application, use next/link and next/navigation for routing.",
      explanation:
        "Bare imports resolve to packages, while relative imports resolve to files. A dependency must be available in the app's workspace. Filename casing can appear to work on one operating system and fail on another, so match the actual filename exactly.",
      actionPlan: [
        "Identify the unresolved import and check whether it is a package name or a local file path.",
        "Correct the path or missing dependency; for Next.js navigation, replace React Router imports with the built-in APIs.",
        "Restart the development server and run the production build to confirm module resolution succeeds.",
      ],
      code: "// Navigation in the Next.js App Router:\nimport Link from 'next/link';\n\nexport default function Navigation() {\n  return <Link href='/history'>View history</Link>;\n}",
      codeLanguage: "TypeScript / Next.js",
    },
  },
  {
    kind: "syntax",
    language: "JavaScript",
    matches: (input) =>
      /SyntaxError|unexpected token|unterminated/i.test(input),
    analysis: {
      rootCause:
        "The parser encountered invalid syntax. An unmatched bracket, missing quote, misplaced comma, or unsupported syntax may appear just before the reported location.",
      suggestedFix:
        "Inspect the reported line and the lines immediately before it. Balance brackets and quotes, then verify that the file extension and runtime support the syntax you are using.",
      explanation:
        "A parser reports where it can no longer understand the code, which may be later than the actual mistake. For example, an unclosed object can cause the next closing brace to be reported as unexpected.",
      actionPlan: [
        "Open the exact file and line in the error, and examine the preceding expression.",
        "Correct mismatched delimiters or unsupported syntax using your editor's parser diagnostics.",
        "Run lint and the build again, then reproduce the original operation.",
      ],
    },
  },
];

const generalAnalysis: DebugAnalysis = {
  rootCause:
    "More context is needed to identify a specific root cause. Start with the first failing operation in your own code.",
  suggestedFix:
    "Find the first relevant stack-frame in your own code and inspect the inputs and assumptions at that line. Reduce the issue to a small reproducible example before changing the implementation.",
  explanation:
    "An exit code or isolated log line can have several causes. The first relevant stack frame and the values at that point help you narrow the problem before changing code.",
  actionPlan: [
    "Capture the full error, stack trace, framework version, and the exact steps that reproduce it.",
    "Inspect the failing line and verify the values, configuration, and dependencies it relies on.",
    "Make one focused change, reproduce the issue again, and add a regression check once you find the cause.",
  ],
};

export function createSession(
  input: string,
  inputKind: InputKind,
  options?: { id?: string; createdAt?: string; isSample?: boolean; analysis?: DebugAnalysis },
): DebugSession {
  const trimmed = input.trim();
  if (!trimmed)
    throw new Error(
      "Paste an error message, code snippet, or logs to get started.",
    );
  if (trimmed.length > MAX_INPUT_LENGTH)
    throw new Error(
      `Keep your input under ${MAX_INPUT_LENGTH.toLocaleString()} characters.`,
    );
  const pattern = patterns.find((candidate) => candidate.matches(trimmed));
  return {
    id: options?.id ?? crypto.randomUUID(),
    title: trimmed
      .split("\n")
      .find((line) => line.trim())!
      .trim()
      .slice(0, 140),
    input: trimmed,
    inputKind,
    createdAt: options?.createdAt ?? new Date().toISOString(),
    language:
      pattern?.kind === "type" && /\.tsx?|:\s*\w+\[\]|useState</.test(trimmed)
        ? "TypeScript"
        : (pattern?.language ?? "General"),
    kind: pattern?.kind ?? "general",
    analysis: structuredClone(options?.analysis ?? pattern?.analysis ?? generalAnalysis),
    isSample: options?.isSample ?? false,
  };
}

export async function analyzeLocally(
  input: string,
  inputKind: InputKind,
  signal: AbortSignal,
): Promise<DebugSession> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Analysis cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 900);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  signal.throwIfAborted();
  return createSession(input, inputKind);
}

export function createSampleSessions(): DebugSession[] {
  return [0, 1, 4].map((exampleIndex, index) =>
    createSession(EXAMPLES[exampleIndex].input, "error", {
      id: `sample-${exampleIndex}`,
      createdAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
      isSample: true,
    }),
  );
}
