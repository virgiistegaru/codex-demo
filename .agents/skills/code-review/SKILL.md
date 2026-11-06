---
name: code-review
description: Perform thorough, read-only code reviews of an entire codebase or specified files, focusing on bugs, type errors, security, performance, and user-requested concerns.
---

# Code Review

Produce a comprehensive, evidence-based report about defects and risks in the requested code. Never modify, format, generate, or delete project files during a review. Do not implement fixes. If the user asks for changes as well as a review, complete the review first and keep any requested implementation clearly separate; never change files as part of the review itself.

## Scope and coverage

- Treat “entire codebase,” “whole project,” and equivalent wording as a request to inspect all project-owned files that can affect behavior, correctness, security, performance, build, or deployment. Identify the repository root and any nested review instructions first. Use file listings and version-control state to establish the scope; inspect ignored or untracked project-owned files when they are relevant. Do not count dependencies, generated output, caches, or build artifacts as project source unless the user names them or they affect a finding.
- When the user names files or directories, inspect every named item and the directly related code needed to understand its behavior. Mention any requested path that is missing or unreadable. Do not silently narrow the requested scope.
- Build a coverage map before drawing conclusions: inspect manifests and configuration, identify application entry points and important data/control flows, then trace relevant callers, callees, shared utilities, and boundaries. For a whole-repository review, account for every in-scope project file, grouping low-risk files by role where useful. Revisit files when tracing cross-file behavior.
- If the repository is too large to inspect fully in one pass, continue in bounded batches and keep track of completed and remaining paths. Do not claim a full review until all in-scope files have been examined. If a real tool or access limit prevents full coverage, state precisely what was and was not reviewed and qualify the report.
- Follow the user's requested focus areas in addition to the default review areas below. Prioritize explicit instructions about scope, languages, subsystems, threat models, or kinds of issues.

## Review areas

Look for concrete, actionable defects rather than stylistic preferences. At minimum, assess the requested code for:

- **Correctness and logic:** wrong conditions, boundary and null handling, invalid state transitions, data loss or corruption, race conditions, error handling, resource lifecycle, serialization, and mismatches between intended and actual behavior.
- **Types and build correctness:** unsafe casts, incorrect or overly broad types that hide defects, invalid API usage, configuration problems, and type/build errors. Use existing type-check or build commands when they are available and appropriate; report what was run and its result. Do not alter files to make checks pass.
- **Security:** trust boundaries and input validation, authentication and authorization, ownership checks, injection, unsafe deserialization or rendering, secret exposure, cryptographic misuse, insecure defaults, and sensitive data handling. Trace data from source to sensitive operations and verify checks at the point of use.
- **Performance and reliability:** avoidable expensive work, unbounded memory or concurrency, N+1 access patterns, inefficient queries or rendering, blocking operations, leaks, and scalability bottlenecks. Explain the conditions and impact rather than reporting speculative micro-optimizations.
- **User-specified concerns:** inspect those areas with the same evidence and severity discipline, even when outside the defaults.

Use repository specifications, architecture docs, framework conventions, and existing tests as evidence about expected behavior. Treat passing tests or static checks as partial evidence; they do not establish the absence of bugs. Do not add tests or mutate the repository to validate a hypothesis. Read-only commands are acceptable when they do not alter project files or external state.

## Findings and report

Report findings first, ordered by severity. For each finding include:

1. A concise title and severity (`Critical`, `High`, `Medium`, or `Low`).
2. The exact file and line or smallest useful range.
3. The triggering condition and the concrete failure or impact.
4. The reasoning or data/control flow that supports the finding.
5. A focused remediation direction, without applying it.

Only include issues supported by the code or reproducible checks. Avoid duplicate findings, generic advice, and claims that depend on unstated assumptions. If uncertainty remains, state the assumption and how it affects severity. If no findings are confirmed, say so and describe the review scope and checks performed; do not imply that a review proves the code is defect-free.

After findings, summarize the scope and coverage, checks run and their results, and any limitations or unreviewed areas. Keep the report useful and complete; do not bury high-impact findings in a file-by-file inventory.
