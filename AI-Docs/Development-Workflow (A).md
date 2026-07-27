# ERP & Project Management System

# AI Development Charter — Part 3A: Development Workflow & AI Collaboration

---

# PRIMARY DEVELOPMENT WORKFLOW

The project must never be generated all at once.

The system must be built incrementally.

Each completed feature should leave the project in a working, production-ready state.

Never break existing functionality while implementing new features.

Every implementation must be compatible with future modules.

---

# FEATURE DEVELOPMENT LIFECYCLE

Every feature must follow exactly this order.

## Step 1 — Requirement Analysis

Before writing any code:

- Explain what the feature does.
- Explain why it is needed.
- Explain how it fits into the ERP system.
- Mention possible future extensions.
- Identify dependencies on existing modules.

Do not start coding before the feature is clearly understood.

---

## Step 2 — Architecture Planning

Before implementation:

Explain:

- Request Flow
- Business Logic Flow
- Database Impact
- Security Considerations
- Validation Requirements
- Performance Considerations

If multiple architectural approaches exist:

Explain all reasonable options.

Recommend the best one.

Wait for approval if the decision significantly affects the architecture.

---

## Step 3 — Package Installation

Only install packages required for the current feature.

Never install future dependencies "just in case."

Explain:

- Why each package is needed.
- Why it was selected.
- Better-known alternatives.
- Trade-offs.

---

## Step 4 — Configuration

Configure only what the feature requires.

Examples:

Environment Variables

Database

Cloudinary

Mail

Swagger

Logger

Never modify unrelated configuration files.

---

## Step 5 — Database

If the feature affects the database:

Update Prisma Schema.

Explain every model.

Explain every relationship.

Explain indexes.

Run migrations.

Never skip migration explanations.

---

## Step 6 — Validation

Build Zod schemas first.

Validate:

- params
- query
- body

Keep validation reusable.

Controllers should never perform validation.

---

## Step 7 — Business Logic

Business logic always belongs inside Services.

Controllers must remain thin.

Routes must remain minimal.

Never mix responsibilities.

---

## Step 8 — Controller

Controllers should:

Receive request.

Call Service.

Return response.

Nothing more.

Controllers must never:

Contain business rules.

Access Prisma directly.

Contain complex calculations.

---

## Step 9 — Routes

Routes should only:

Register endpoints.

Attach middleware.

Attach validators.

Call controllers.

No business logic.

---

## Step 10 — Swagger Documentation

Document every endpoint immediately after implementation.

Documentation must never become outdated.

---

## Step 11 — Manual Review

After implementation:

Review:

Readability

Architecture

Performance

Security

Possible improvements

Do not continue until the review is complete.

---

# FEATURE COMPLETION CHECKLIST

A feature is considered complete only if it includes:

✓ Routes

✓ Controllers

✓ Services

✓ Validation

✓ Database changes (if required)

✓ Swagger documentation

✓ Error handling

✓ Logging

✓ Security review

✓ Code review

Never mark incomplete work as finished.

---

# IMPLEMENTATION ORDER

The ERP should be implemented in this order.

## Phase 1

Project Setup

Application Configuration

Environment Variables

Logging

Security Middleware

Database Connection

Prisma

Swagger

Error Handling

---

## Phase 2

Authentication

Authorization

Roles

Permissions

User Management

---

## Phase 3

Company Management

Organizations

Branches

Departments

Employees

Teams

---

## Phase 4

Project Management

Projects

Project Members

Milestones

Tasks

Subtasks

Task Status

Task Priorities

Task Attachments

Task Comments

Time Tracking

---

## Phase 5

Clients

Vendors

Meetings

Calendar

Files

Notifications

---

## Phase 6

Reports

Dashboard

Statistics

Analytics

Activity Logs

Audit Logs

---

## Phase 7

Redis

Socket.IO

BullMQ

Docker

Testing

Deployment

CI/CD

---

# MODULE ISOLATION

Every module must remain independent.

Example:

Authentication must not contain Project logic.

Projects must not contain Employee logic.

Notifications must not modify Tasks.

Reports should consume data rather than own business logic.

---

# REUSABILITY

Whenever logic can be reused:

Extract it.

Never duplicate code.

Shared utilities belong inside:

utils/

Shared constants belong inside:

constants/

Configuration belongs inside:

config/

---

# AI DECISION-MAKING RULES

Before introducing any new idea:

Ask:

Does it improve maintainability?

Does it reduce complexity?

Is it commonly used in production?

Will another developer understand it?

If the answer is no:

Do not implement it.

---

# AI COLLABORATION RULES

The AI should behave like an experienced technical lead.

It should:

Explain.

Recommend.

Teach.

Warn.

Review.

It should never:

Blindly generate code.

Guess requirements.

Invent features.

Ignore architecture.

Skip explanations.

---

# LEARNING-FIRST APPROACH

Whenever introducing:

A library

A pattern

A middleware

A database concept

A security technique

An optimization

Explain:

What it is.

Why it exists.

When to use it.

When not to use it.

How it compares to alternatives.

Keep explanations concise.

Avoid unnecessary theory.

---

# CHANGE MANAGEMENT

Whenever a new feature requires modifying existing code:

Explain:

Why the modification is necessary.

Which files are affected.

Potential risks.

Expected benefits.

Never modify unrelated files.

---

# REFACTORING POLICY

Refactor only when one of the following is true:

Code duplication exists.

Readability significantly improves.

Performance measurably improves.

Architecture becomes cleaner.

Never refactor simply because another style is possible.

---

# BACKWARD COMPATIBILITY

New implementations must not break:

Existing APIs.

Existing database models.

Existing authentication.

Existing business logic.

If breaking changes are unavoidable:

Explain them first.

Wait for approval.

---

# DOCUMENTATION RULES

Every important architectural decision should be documented.

Whenever introducing:

Authentication

Caching

Queues

WebSockets

Database Design

Explain the reasoning.

Future developers should understand the decision without reading the implementation.

---

# LONG-TERM THINKING

Every feature should be implemented as if the project will still be maintained five years from now.

Favor:

Maintainability

Consistency

Predictability

Readability

Modularity

Avoid:

Quick fixes.

Temporary hacks.

Shortcuts.

Magic code.

Premature optimization.

---

# FINAL DEVELOPMENT PRINCIPLE

Every line of code should satisfy one simple question:

"Would this implementation be accepted during a senior-level code review in a professional software company?"

If the answer is uncertain,

improve the implementation before presenting it.
