# AI Outreach Automation Platform

A Gmail-based cold outreach automation platform for sales, growth, and recruiting teams. Import leads, build multi-step email campaigns, send from your own connected Gmail accounts on a schedule, and manage prospect replies from a unified inbox — all from one product.

## Problem

Outbound email outreach is still mostly manual: sales and growth teams juggle spreadsheets of leads, hand-craft emails one at a time, forget to follow up, and lose track of replies scattered across personal inboxes. Existing outreach tools are often expensive, built for large sales orgs, or disconnected from the mailbox the sender actually sends from.

This platform solves that by giving individuals and small teams a lightweight, Gmail-native way to:

- Turn a raw list of leads into a structured, deduplicated database
- Send personalized, templated email sequences at scale without leaving their own Gmail identity
- Automatically pace sends within safe time windows to protect sender reputation
- Track every reply in one place instead of hunting through a personal inbox

## Target Audience

- **Founders and small sales teams** running cold outreach without a dedicated SDR org or enterprise sales-engagement tool
- **Recruiters and agencies** doing candidate or client outreach at scale
- **Growth/marketing teams** running lead-gen or partnership outreach campaigns
- **Freelancers and consultants** prospecting for new business through their own Gmail account

## Core Features

### Gmail-Native Sending
Connect one or more Gmail accounts via Google OAuth (per-user connection limit is configurable). All campaign emails send from a real, connected Gmail mailbox — not a third-party relay — with access/refresh tokens encrypted at rest.

### Lead List Management
Import leads from CSV or XLSX with custom column mapping to standard fields (name, email, company, job title, location, LinkedIn URL, etc.) or arbitrary custom fields. Imports are validated and deduplicated, with per-list upload metadata and support for up to 20,000 leads per file.

### Email Templates
A rich-text template editor with merge-field variables (e.g. `{{firstName}}`, `{{companyName}}`) for personalizing sends per-lead, plus template duplication, draft/active status, and one-click send-test.

### Multi-Step Campaigns
A guided campaign builder that ties everything together:
- Pick an initial outreach template
- Configure a scheduled follow-up (with a configurable delay) if no reply is received
- Attach a lead list
- Define a send window — active weekdays, start/end time, and time zone
- Review and launch, then activate, pause, or resume the campaign at any time

### Scheduled, Rate-Limited Delivery
A background scheduler claims due sends within each campaign's configured window and queues them through AWS SQS. A worker process sends through the correct connected Gmail account with proper thread-safe headers (`In-Reply-To`, `References`, `threadId`) so follow-ups and replies stay in the same email thread — while respecting a configurable per-account rate limit.

### Unified Reply Inbox
A background sync worker polls each connected Gmail account for new activity and threads inbound replies into conversations automatically. The Inbox UI lets users read, reply, mark as read, and archive prospect conversations without switching to Gmail.

### AI Persona *(in development)*
A configurable "AI Persona" is designed to define the tone and voice the platform writes with, so AI-assisted and AI-generated outreach — including automated reply handling — sounds consistent and on-brand for each user. The campaign reply-handling flow already supports an AI-driven mode at the data layer, and the AI Persona dashboard section is where the feature is being built out.

The first piece is live: **Sent Folder Import & Selection**, scoped per connected Gmail account. From the AI Persona section, a user picks a time period (last 3/6/12 months, all time, or a custom range), and the platform fetches that account's Sent folder, applies baseline server-side filtering — dropping likely-internal recipients, auto-generated mail (out-of-office, calendar invites, bounces), and outlier-length emails, and collapsing near-identical templated sends into one representative example with a "sent to N recipients" count — then presents the surviving candidates as a checkbox list (subject, recipient domain, date, preview) for the user to review and confirm. The confirmed selection is saved as a versioned, per-account **Persona Source Set**. Style/tone extraction, embeddings, and actually generating drafts from this source set are not built yet — this step only gets clean, user-approved source emails ready for that future training step.

## Tech Stack

**Backend** — Node.js, Express, MongoDB/Mongoose, JWT auth (access + refresh tokens), Google APIs client (Gmail OAuth + send/sync), AWS SQS for the send queue, Luxon for timezone-aware scheduling, Zod for validation.

**Frontend** — Next.js (App Router) + React, Redux Toolkit, React Hook Form, Tiptap rich-text editor, Tailwind CSS, Radix UI primitives.

**Architecture** — The backend runs as an API server plus three independent background processes: an email-send worker, a Gmail reply-sync worker, and a campaign scheduler — decoupled via an SQS queue so sending and scheduling scale independently of the API.

## Project Structure

```
.
├── backend/     # Express API + background workers (send, sync, scheduler)
└── frontend/    # Next.js dashboard application
```

## Getting Started

### Prerequisites

- Node.js
- MongoDB instance
- AWS account with an SQS queue (or credentials to provision one)
- Google Cloud project with OAuth credentials for Gmail API access

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MongoDB URI, JWT secrets, Google OAuth credentials, AWS/SQS config
npm run sqs:setup      # provisions the SQS queue + DLQ
npm run dev            # API server
npm run worker:dev      # email-send worker
npm run sync:dev        # Gmail reply-sync worker
npm run scheduler:dev   # campaign scheduler
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend API to be reachable at the URL configured in its environment file, and the backend expects `FRONTEND_URL`/`CORS_ORIGIN` to point back at the frontend for CORS and OAuth redirects.
