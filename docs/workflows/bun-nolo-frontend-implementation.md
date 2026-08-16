# Bun Nolo Frontend Implementation

Use this workflow reference when an agent needs to make reviewable frontend
changes in the `bun-nolo` product. This is a project-specific reference built
on top of the generic AI-native workflow reference idea. It is not a platform
command and should not be copied as a hardcoded product category.

The agent owns the implementation choices. The reference provides the operating
context, expected evidence, and writeback protocol.

## Operating Model

- Product frontend implementation defaults to `frontend-implementer`.
  `project-manager` is optional when the user explicitly wants durable intake,
  breakdown, or distribution before implementation.
- The task should include the user request, relevant task row or assignment, and
  any screenshots or reproduction notes.
- The agent should work in an isolated workspace when code changes are expected.
- The agent should leave reviewable evidence: changed files, verification, and
  visual evidence when the change affects visible UI.
- The agent should report task facts in the dialog/checkpoint/artifacts and use
  normal task row updates when the chosen route has table-write permission,
  rather than relying only on final chat text.

## Expected Outputs

- dialog id
- changed files or commit summary
- verification commands/results
- screenshot or visual probe reference for visible UI changes
- dialog/checkpoint outcome or blocker
- unresolved risks

## Completion Stop Protocol

The frontend agent should stop using tools and produce the final report once it
has named the root cause, made the scoped patch, run the smallest relevant
verification or recorded a precise blocker, captured real-app visual evidence
for visible UI work or recorded the visual blocker, inspected `gitStatus` and
`gitDiff`, and cleaned up any preview it started. After these facts are true,
more exploration is a regression: do not start a new repository search, broad
refactor, or unrelated polish pass.

Runtime budgets are safety rails, not work targets. If an agent exits nonzero
or times out after producing a reviewable commit or dirty diff, dialog/checkpoint
writeback should recover that run into `needs_review` and attach a
handoff artifact, so the task board reflects the reviewable state instead of
only the transport failure.

## Failure Protocol

If the agent cannot proceed, it should record a blocker with the narrowest
useful layer, for example `context`, `runner`, `preview`, `tool`, `permission`,
or `review`. It should include what it tried and what input/tool is missing.

<!-- workflow-config
version: "0.1"
kind: workflow
id: bun-nolo/frontend-implementation
name: Bun Nolo Frontend Implementation
description: Produce reviewable frontend product changes with task row subject refs and visual evidence.
defaultAgent: frontend-implementer
inputs:
  - msg
  - taskRowDbKey
  - artifactIds
  - image
recommendedTools:
  - captureVisualState
  - execShell
  - readFile
  - searchFiles
requiredOutputs:
  - dialogId
  - changedFiles
  - verification
  - taskRowEvidence
gates:
  - reviewableChange
  - visualEvidence
  - taskRowEvidence
contextStrategy: Read the task row, linked dialog or artifacts, and existing frontend guidance before editing.
failureProtocol: Record a blocker instead of silently stopping when context, tools, runner, preview, or permission is missing.
-->
