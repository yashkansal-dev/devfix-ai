# DevFix AI

Paste an error. Understand the cause. Get a fix.

Local Phase 2 is prepared: Next.js 16.3.8, React 19.2.8, TypeScript, App Router, and custom CSS Modules. The frontend exports as static files; an undeployed Lambda handler and Bedrock Converse adapter are separate. No Tailwind, database, authentication, or AWS credentials in the browser.

**Mock mode is the default. Bedrock inference is disabled by default. Nothing has been deployed.**

## Run locally

Use Node.js 22+ and npm. The future Lambda template uses Node.js 24.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Mock mode needs no environment variables or AWS credentials. Fonts and icons are local/system assets.

Optional configuration:

```bash
cp .env.example .env.local
```

Only `DEVFIX_ANALYSIS_MODE` and `DEVFIX_API_URL` are explicitly exposed to the frontend. They are non-secret, build-time configuration; restart development or rebuild after changing them. Backend variables are never exposed by Next.js. Keep `.env.local` ignored and never put credentials in it.

| Configuration | Purpose |
| --- | --- |
| `DEVFIX_ANALYSIS_MODE=mock` | Existing local pattern-based analysis, no network requests. |
| `DEVFIX_ANALYSIS_MODE=api` | Send the request to `DEVFIX_API_URL`; failures remain visible, with no silent mock fallback. |
| `DEVFIX_API_URL=` | Full future HTTPS endpoint, including `/api/analyze`. Loopback HTTP is allowed for local testing. |
| `BEDROCK_REGION=ap-south-1` | Backend only; other Regions are rejected. |
| `BEDROCK_MODEL_ID=` | Backend only; explicit allowlist of small model candidates. |
| `DEVFIX_BEDROCK_ENABLED=false` | Backend safety switch. Enable only after explicit approval for inference. |

## Checks

Run these sequentially; Next.js type generation and builds both write into `.next`.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:backend
```

To preview the exported production frontend locally (no Next.js server or AWS):

```bash
npm start
```

## Demo flow

1. On Home, paste an error, code, or logs, or select one of the five examples.
2. Click **Analyze Error** (or press Cmd/Ctrl + Enter). A loading state precedes the result.
3. Read **Root Cause**, **Suggested Fix**, **Explanation**, and the three-step **Action Plan**. Copy the original input or suggested code.
4. Open **History** to search sessions and reopen an analysis. Refreshing a result preserves it in the same browser.
5. Use the header theme button to switch between dark and light colors.

The local analyzer recognizes undefined/null `.map()` errors, MongoDB connectivity, JWT signature failures, CORS, missing modules, and syntax errors. Other inputs receive general troubleshooting guidance that explains the need for more context. Mock responses are predefined demonstrations. The same interface is used for future API responses; mode selection remains in developer configuration.

## Browser history

Three clearly labeled sample sessions appear on first use. The 30 most recent sessions are kept under `devfix.sessions.v1` in localStorage. **Clear all** asks for confirmation and leaves an empty history; refreshing does not restore the samples. Browser storage is specific to the browser and origin. Clearing site data removes the sessions.

If storage is corrupt, blocked, or full, a visible message explains the problem and analysis continues with in-memory sessions for that tab. Pasted code is displayed as text and is never executed. Mock mode sends nothing to a server. API mode sends input to the configured endpoint. Both modes keep history in the browser.

Results use `/analysis/?id=<session-id>` so arbitrary browser-generated IDs work on static hosting and after refresh. Existing localStorage sessions retain their format and open through the updated history links. Previous `/analysis/<id>` bookmarks must be reopened from History.

## Structure

- `app/`: Home, History, static Analysis route, shared layout, error/404 handling, and global color tokens.
- `components/`: reusable shell, editor/dashboard, history/results views, session list, code blocks, icons, empty/loading states, and scoped CSS.
- `lib/debug-types.ts`: typed analysis and session data, input/history limits.
- `lib/mock-analysis.ts`: examples, pattern matching, sample sessions, and cancellable mock analysis.
- `lib/analysis-contract.ts`: shared request/response validation; 5,000-character input, exactly three action steps, bounded response fields.
- `lib/analyze-client.ts`: centralized mock/API switch, safe HTTP errors, cancellation, and a 25-second deadline.
- `lib/session-storage.ts`: validated localStorage, bounded history, cross-tab updates, and graceful memory fallback.
- `backend/`: server-only Bedrock SDK adapter and future HTTP API Lambda handler. The handler has a 20-second work deadline, capped by Lambda's remaining time. SDK retries are disabled (`maxAttempts: 1`) and output is capped at 1,024 tokens.
- `infra/template.yaml`: undeployed SAM configuration for one Lambda, one HTTP API, its execution role, and seven-day logs. The role can invoke only the selected in-region model and write to its own log group.
- `scripts/`: static preview, backend bundling, and Node test runner using esbuild.
- `tests/`: contracts, mock/API flow, timeout/cancellation, handler/SDK stubs, and browser history storage.
- `docs/aws-next-phase.md`: live MCP findings, deployment blockers, evidence instructions, and future approval-gated steps.
- `public/icon.svg`: product icon; the existing starter assets remain available.

## Manual verification

Check blank and whitespace input, each example, an unrecognized error, loading/double submission, copy buttons, session search, a direct result URL after refresh, missing session URLs, clearing history, dark/light themes, and a narrow mobile viewport. Corrupt or disable localStorage to check the visible fallback.

`npm run build` writes the frontend to `out/`. `npm run build:backend` writes a self-contained CommonJS Lambda bundle and a generated `package.json` to `build/backend/`, which SAM uses as its `CodeUri`. The Bedrock SDK and its production dependencies are bundled into `index.cjs`; the generated manifest has no npm dependencies to install. The build rejects external imports other than Node.js built-ins and verifies that the SDK is included. Its dependency metadata is saved separately in `build/backend-metafile.json` for inspection. Run the backend build before `sam build`. These outputs are ignored by Git. There is no Next.js API route because a static export cannot serve it; the future HTTP API provides `POST /api/analyze`.

No SAM deployment, IAM change, model-access change, billing change, or Bedrock inference is authorized in this phase. See [future AWS steps](docs/aws-next-phase.md) before proceeding.
