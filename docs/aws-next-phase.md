# DevFix AI: AWS preparation and next phase

This phase changes local code only. AWS inspection used read-only MCP calls. No resources, IAM, model access, billing settings, or inference were changed. The project must remain on its active Free plan in `ap-south-1`.

## Current Bedrock finding — October 1, 2026

Seven `GetFoundationModelAvailability` calls through AWS MCP returned the following. Each model had agreement, entitlement, and regional availability `AVAILABLE`, with authorization `NOT_AUTHORIZED` for the current MCP caller:

| Checked model ID | Authorization |
| --- | --- |
| `qwen.qwen3-coder-30b-a3b-v1:0` | NOT_AUTHORIZED |
| `mistral.ministral-3-3b-instruct` | NOT_AUTHORIZED |
| `mistral.ministral-3-8b-instruct` | NOT_AUTHORIZED |
| `google.gemma-3-4b-it` | NOT_AUTHORIZED |
| `openai.gpt-oss-20b-1:0` | NOT_AUTHORIZED |
| `meta.llama3-8b-instruct-v1:0` | NOT_AUTHORIZED |
| `mistral.mistral-7b-instruct-v0:2` | NOT_AUTHORIZED |

No currently authorized alternative was found among these seven. These control-plane checks do not prove inference works and do not identify the particular policy causing the authorization denial. No inference test was performed.

**Provisional cost-first choice: `mistral.ministral-3-3b-instruct`.** It is the smallest checked text model and supports in-region Converse in Mumbai. Its suitability for debugging is an inference from its instruction model capabilities; quality must be evaluated after approval. Qwen3 Coder remains a coding-focused alternative, also blocked for the current caller. The template defaults to Ministral 3B and the backend model environment variable remains unset locally. [Model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-ministral-3b.html), [current pricing](https://aws.amazon.com/bedrock/pricing/).

For a normal SigV4 SDK `Converse` call without tools or guardrails, the Lambda execution role needs **`bedrock:InvokeModel`** on the selected foundation-model ARN. It does not need a `bedrock:Converse` action, streaming permission, full Bedrock access, or human access keys. [Converse API permission](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).

For the default model this is:

```text
arn:aws:bedrock:ap-south-1::foundation-model/mistral.ministral-3-3b-instruct
```

Model agreement/entitlement checks do not currently show a subscription or first-time-use blocker. AWS documents Mistral and Qwen as models without Marketplace subscription requirements. No model-access toggle, Marketplace action, or plan upgrade is recommended from these findings. [Model access documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html).

**Future manual approval needed:** authorize creation of the scoped Lambda execution role and other listed resources. Then verify the role's model permission and any managed project SCP/RCP restrictions. The current caller's denial does not prove a future Lambda role will be denied. If a managed restriction still blocks inference, inspect that restriction with AWS support; do not add broad human permissions or upgrade the plan. [Managed project policy context](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html).

IAM Policy Autopilot was run locally against the actual SDK source:

```bash
uvx iam-policy-autopilot@latest generate-policies \
  /Users/yashkansal/code/devfix-ai/backend/bedrock.ts \
  --region ap-south-1 --service-hints bedrock-runtime --pretty
```

Its baseline includes optional guardrail/tool/bearer-token permissions and wildcard resources. That broad baseline is not included in the template. The template follows the documented Converse minimum for this implementation and scopes the model resource exactly. No policies were uploaded.

## Lambda concurrency blocker

One read-only MCP `lambda:GetAccountSettings` call reported total and unreserved concurrency **10**, and function count **0**. The template sets `ReservedConcurrentExecutions: 2`. AWS requires leaving 100 executions unreserved, so the current quota cannot accommodate this reservation. [Concurrency rules](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html).

Before any deployment, approve an investigation of whether a Free-plan-compatible concurrency quota change is possible. At least 102 total executions would be needed for this reservation when there are no other reservations. Do not request a quota change yet, silently remove the function limit, or upgrade to Paid. If it cannot be supported on the Free plan, revisit the concurrency design before deployment. The template is prepared and linted, but is not currently deployable with the inspected quota.

## Architecture

```text
Browser
  ↓
Amplify-hosted static Next.js frontend (out/)
  ↓ POST { input, inputKind } to configured HTTPS URL
API Gateway HTTP API — POST /api/analyze
  ↓
Node.js 24 Lambda — validation and 20-second deadline
  ↓ Converse / maxTokens 1024 / maxAttempts 1
Amazon Bedrock — selected in-region model
```

History remains in browser localStorage. No database, EC2, VPC, NAT gateway, authentication, or extra environment is part of the MVP. Static hosting avoids relying on Amplify support for Next.js 16 SSR. [Amplify manual static deployment](https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html).

The API has exact-origin CORS and conservative throttling (0.2 requests/second, burst 2). CORS does not authenticate a public endpoint and API throttling is best effort, not a guaranteed spend ceiling. Inference stays disabled until explicitly approved. The Lambda has no provisioned concurrency; logs expire after seven days and never record user input, model output, or raw exceptions. [API throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html).

## Evidence to capture

Capture the actual AWS MCP result for the seven Bedrock availability calls. Include the selected Region `ap-south-1`, model IDs, `authorizationStatus: NOT_AUTHORIZED`, all availability fields, and successful `GetFoundationModelAvailability` call records. Save the screenshot as **`aws-mcp-bedrock-verification.png`**. Label it read-only authorization verification, not successful inference.

`hackathon-proof/aws-mcp-bedrock-verification.png` already exists and was left untouched. The newly recorded, non-secret MCP fields are in `hackathon-proof/phase2-aws-readonly-verification.json`; this is an extraction of the real result, not a substitute for a tool screenshot.

## Next phase — explicit approval required

**Do not run deployment commands until authorization and the concurrency blocker are resolved and resource creation is approved.** Install SAM CLI locally if needed; it is not installed in the current environment.

1. Confirm the project remains Free in AWS Settings and selected Region remains Mumbai. Resolve the concurrency question without upgrading. Approve the scoped execution role and model invocation separately from deployment.
2. Approve creating one Amplify static app. Record its HTTPS origin (without trailing slash) as the `FrontendOrigin` SAM parameter. Manual ZIP hosting is sufficient; no SSR compute is needed.
3. Prepare and validate the backend locally:

   ```bash
   npm run build:backend
   sam validate --lint --template-file infra/template.yaml --region ap-south-1
   sam build --template-file infra/template.yaml --region ap-south-1
   ```

4. **After resource-creation approval**, deploy with confirmation enabled:

   ```bash
   sam deploy --guided --region ap-south-1 --profile yashkansal
   ```

   Choose stack name `devfix-ai`, template `.aws-sam/build/template.yaml`, the approved Amplify origin, model `mistral.ministral-3-3b-instruct`, and `EnableBedrockInference=false`. Review and confirm the change set and IAM capability. SAM deployment also needs a packaging S3 bucket, either an approved existing bucket or one SAM creates. These are future resource changes, not actions taken in this phase.

5. Inspect the deployed execution role and project restrictions. **After a separate approval for billable inference**, redeploy with `EnableBedrockInference=true`; make one short model test and check JSON quality. If denied, stop and diagnose the exact denial rather than changing the plan or choosing an expensive model.
6. Set `.env.local` to `DEVFIX_ANALYSIS_MODE=api` and `DEVFIX_API_URL=<AnalysisApiUrl output>`. Keep all AWS credential variables out of frontend configuration. Rebuild:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

7. ZIP the **contents** of `out/` with `index.html` at the archive root and upload through Amplify's manual deployment flow after hosting approval. Verify one analysis, history, refresh, errors, and mobile behavior. Agree whether to keep or clean up the successfully created resources after the demo.
