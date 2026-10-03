@AGENTS.md

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about SCPs and RCPs, go to https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions.
- Create all Regional resources in the project's assigned Region.
- You can use us-east-1 for AWS WAF and CloudWatch Logs only when global resources require it; otherwise use the selected Region.
- Do not attempt to create Lambda, API Gateway, or other Regional resources in another Region.
- Direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If they cannot confirm it, check `~/.aws/config`.
- Do not use Lambda@Edge, CloudFormation StackSets, cross-Region replication, multi-Region KMS keys, or Route 53 cross-Region routing.
- CloudFront actions are allowed in us-east-1, but Lambda and API Gateway must be created in the project Region.
- IAM permissions for human access are managed by AWS. Do not assign roles to team members unless absolutely necessary.
- If resources suddenly become inaccessible after previously working, ask about the spend limit and direct the user to AWS Settings > Billing.
- Ask whether the user wants to clean up successfully created resources or keep them to reduce cost.
- If an AWS service is unavailable, run `aws freetier get-account-plan-state`, then consult the supported-services lists for the user's plan.
- Before starting a task, check whether a relevant AWS skill is available and prefer its guidance.

### Help level

- `help_level` (required): LOW, MEDIUM, or HIGH. While a user is building, ask: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."
- LOW follows all constraints, executes requests without modification, and asks no clarifying questions unless security requires it.
- MEDIUM executes requests and may ask up to two clarifying questions for ambiguity or potential issues, without repeating dismissed questions or explaining trade-offs unless asked.
- HIGH explains each step, suggests alternatives, flags best practices, and still executes the user's choice.
<!-- END AWS Agent Toolkit rules -->
