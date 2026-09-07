# Implementation Plan — AI Persona: Sent Folder Import & Selection

Source: PRD "AI Persona — Sent Folder Import & Selection" (owner: Indrajit, Draft).
This plan translates that PRD into concrete work against this codebase. Nothing in this
file has been implemented yet — it lives inside the **AI Persona** section
(`frontend/src/app/dashboard/ai-persona/`), which today is a stub (see "Current state" below).

Scope matches the PRD exactly: fetch → filter → select → save a **Persona Source Set**.
No style extraction, no embeddings, no draft generation, no incremental re-sync. Those are
listed in §7 as future work and are explicitly not part of this build.

---

## 0. Current state (as of this branch)

- `frontend/src/app/dashboard/ai-persona/page.tsx` renders `AIPersona` from the new,
  untracked `frontend/src/components/dashboard/AI-Persona.tsx`, which is a `"Coming soon"`
  placeholder (`<h1>Hello, this is the AI Persona Section</h1>`) — no forms, no API calls.
- No backend model/service/controller/route for AI Persona exists anywhere in `backend/src`.
- Gmail OAuth is already wired: `GmailConnection` model + `gmail-connection.service.js`
  already requests `gmail.readonly` scope (`backend/src/services/gmail-connection.service.js:10-19`),
  so **no new OAuth scope or reconnect flow is needed** — existing connected accounts can
  already read Sent mail.
- `backend/src/services/gmail.service.js` has `createGmailClient()`, `getMessage()` (fetch +
  parse a single message via `extractBodies`/`extractHeader`), and `listHistory()` (paginated
  `history.list`, delta-sync pattern) — but **no `messages.list` call exists yet**. That's new.
- The existing "reply-sync" worker (`gmail-sync.worker.js` → `conversation.service.js`) only
  processes messages belonging to *tracked outreach threads* — it never reads the whole Sent
  folder. It's a useful pattern reference (idempotent import via a unique index, per-account
  failure isolation) but not reusable code as-is.

---

## 1. Decisions on the PRD's open questions (§6)

The PRD leaves three things unresolved. Recommending concrete answers so the build isn't
blocked:

**Q1 — Store full body text, or reference by message ID and fetch on demand?**
→ **Store it.** Mirror `Message.bodyText`/`bodyHtml` (`backend/src/models/message.model.js:53-60`).
Fetching on demand means re-authenticating against Gmail every time the (future) training step
reads source emails, and a disconnected/revoked account would silently break the persona.
Storing the body is also required for the candidate-list preview (5.4) and is consistent with
how `Message` already persists synced mail. Store `bodyText` (already stripped) as the primary
signal source; `bodyHtml` is optional/skippable to save space since style extraction (future
work) will most likely work off text.

**Q2 — Full recipient email addresses, or domain-only in the selection UI?**
→ **Domain-only in the UI and in storage**, per PRD 5.5 ("recipient domain") and 5.4
("recipient (or domain only, depending on privacy posture)"). Store `recipientDomain`, not
the full address. This is stricter-by-default and matches the field name the PRD's storage
section (5.5) already specifies. Full addresses aren't needed for anything in this PRD's
scope (no per-recipient logic downstream of selection).

**Q3 — Where does the internal/company domain list come from?**
→ **Inferred, not user-configured**, for this build: the connected account's own send domain
(from `GmailConnection.email`) plus common free-mail providers are *not* excluded (a solo
founder emailing prospects from a personal Gmail is a real case) — only the sender's exact
domain is treated as "internal." Recipients sharing the sender's domain are filtered out as
likely-internal. A user-configurable exclusion list is reasonable future work but isn't
required to satisfy 5.3's bullet ("exclude emails sent to internal/company domains") and
would add UI scope the PRD doesn't ask for.

---

## 2. Data model

### 2.1 `PersonaSourceSet` — one per import batch, scoped to `gmailConnectionId`

New file: `backend/src/models/persona-source-set.model.js`

```js
{
  userId: ObjectId (ref User, required, index),       // denormalized, same pattern as Message
  gmailConnectionId: ObjectId (ref GmailConnection, required, index),
  status: enum ["draft", "confirmed"] (default "draft"),
    // "draft" = candidates fetched, user still selecting (steps 4-6 in the PRD flow)
    // "confirmed" = user completed step 6/7, this batch is the saved Persona Source Set
  timePeriod: {
    preset: enum ["3m", "6m", "12m", "all", "custom"],
    from: Date | null,
    to: Date | null,
  },
  candidateCount: Number,     // total candidates surfaced after baseline filtering
  selectedCount: Number,      // set at confirmation time
  confirmedAt: Date | null,
  createdAt / updatedAt (timestamps: true),
}
```
Collection: `persona_source_sets`. Index: `{ gmailConnectionId: 1, status: 1 }` (only one
`draft` per connection makes sense operationally, but per PRD 5.5 — "should not silently
overwrite a prior set" — **do not** enforce a uniqueness constraint on `confirmed` sets; each
confirmed import is its own versioned record, newest wins for training but old ones aren't
deleted).

### 2.2 `PersonaSourceEmail` — one per selected/candidate email

New file: `backend/src/models/persona-source-email.model.js`

```js
{
  personaSourceSetId: ObjectId (ref PersonaSourceSet, required, index),
  gmailConnectionId: ObjectId (ref GmailConnection, required, index), // denormalized for query-by-account
  gmailMessageId: String (required),
  subject: String (default ""),
  bodyText: String (default ""),
  snippet: String (default ""),           // short preview, PRD 5.4
  recipientDomain: String (required),     // domain-only, see Q2 above
  duplicateCount: Number (default 1),     // "sent to N recipients", PRD 5.3
  sentAt: Date (required),
  filterReason: String | null,            // why baseline filter pre-unchecked it, for UI hint
  included: Boolean (default false),      // user's checkbox state; true = in final source set
  createdAt / updatedAt (timestamps: true),
}
```
Collection: `persona_source_emails`. Unique index `{ gmailConnectionId: 1, gmailMessageId: 1 }`
— same idempotency idiom as `Message` (`message.model.js:79`) so re-fetching the same window
twice can't duplicate candidates within a draft. Index `{ personaSourceSetId: 1, included: 1 }`
for the "list selected" query the future training step will use.

Two collections (batch + emails) rather than one, matching the `Conversation`/`Message` split
already in this codebase — keeps the "list candidates for this draft" query and the "get this
account's confirmed source emails" query both cheap and index-friendly, and makes "versioned,
non-overwriting" (PRD 5.5) natural: a new import = a new `PersonaSourceSet` document, old ones
untouched.

---

## 3. Backend implementation

Following the campaign module's layering exactly (`routes → controllers → services →
repositories → models`, per `backend/src/models/campaign.model.js`,
`campaign.repository.js`, `campaign.service.js`, `campaign.controller.js`,
`campaign.routes.js`, `campaign.validator.js`).

### 3.1 Gmail service: add Sent-folder listing

`backend/src/services/gmail.service.js` — add `listSentMessages({accessToken, refreshToken, after, before, pageToken})`:
- `gmail.users.messages.list({ userId: "me", q: buildSentQuery(after, before), pageToken, maxResults: 100 })`
  where `buildSentQuery` composes `in:sent after:<unix> before:<unix>` (Gmail search operators
  take epoch seconds), mirroring the existing pagination shape of `listHistory` (lines 106-116).
- `messages.list` only returns `{id, threadId}` — for each id, reuse the existing `getMessage()`
  (lines 156-177) to fetch and parse via `extractBodies`/`extractHeader`. Batch these with
  bounded concurrency (Gmail per-user rate limits apply); reuse whatever concurrency-limiting
  approach exists in the sync worker, or a simple `p-limit`-style batch of ~10 at a time if none
  exists.

### 3.2 New: `persona-import.service.js`

Orchestrates PRD flow steps 3–7:
1. `startImport({ userId, gmailConnectionId, timePeriod })` — creates a `draft`
   `PersonaSourceSet`, fetches Sent mail for the window via 3.1, and for each message:
   - parses `To` header → `recipientDomain`
   - runs baseline filters (3.3) → sets `filterReason` (null if it passes clean) and initial
     `included` (pre-checked/unchecked per PRD 5.4)
   - dedup pass (3.3) groups near-identical bodies, keeps one representative, sets
     `duplicateCount`
   - bulk-inserts `PersonaSourceEmail` docs, updates `candidateCount` on the set
   - returns the draft set id + candidate list (paginated) to the controller
2. `updateSelection({ personaSourceSetId, userId, updates: [{id, included}] })` — toggles
   individual/bulk checkbox state (PRD 5.4), no Gmail calls.
3. `confirmImport({ personaSourceSetId, userId })` — validates ownership + `status === "draft"`,
   sets `status: "confirmed"`, `confirmedAt`, `selectedCount = count(included=true)`, deletes
   (or simply leaves, since `included:false` rows are cheap and useful for future re-review)
   the unselected candidate rows — **recommendation: keep them**, just filtered out of any
   future "get source set for training" query by `included: true`, so the user's baseline-filter
   decisions remain inspectable/undoable rather than destroyed at confirm time.

### 3.3 New: `email-classification.util.js` (baseline filters, PRD 5.3)

Pure functions, no Gmail/DB dependency, unit-testable in isolation:
- `isInternalRecipient(recipientDomain, senderDomain)` — exact-match against sender's domain
  (see Q3 above).
- `isAutoGenerated({subject, bodyText, fromEmail})` — pattern match on common signals: subject
  prefixes (`"Out of Office"`, `"Automatic reply"`, `"Undelivered Mail"`, `"Calendar:"`),
  `fromEmail` patterns (`no-reply@`, `noreply@`, `mailer-daemon@`, `calendar-notification@`),
  and MIME/body hints already available from `extractBodies` (e.g. `text/calendar` part
  present). Keep this a small, explicit rule list — no ML — matching the PRD's ask for
  "baseline filtering," not sophisticated classification.
- `isLengthOutOfRange(bodyText, {min, max})` — simple char/word count thresholds (config
  constants, e.g. `MIN_BODY_CHARS = 50`, `MAX_BODY_CHARS = 5000` — tune during build).
- `dedupeKey(subject, bodyText)` — normalize (strip whitespace/merge-field-like tokens,
  lowercase) and hash, so templated blasts with only a name/company swapped collapse into one
  representative + `duplicateCount`. Start simple (exact-normalized-match); don't build fuzzy
  similarity scoring — not asked for and adds real complexity/risk of false-collapsing distinct
  emails.
- `scoreConfidence(...)` → drives the pre-checked/unchecked default in PRD 5.4. Simplest
  correct version: `included = !filterReason` (clean-of-all-baseline-filters emails start
  checked, anything flagged starts unchecked) — matches "high-confidence sales emails
  pre-checked, ambiguous ones unchecked" without needing a scoring model.

### 3.4 Controller / Routes / Validators / DTO

- `backend/src/controllers/persona-import.controller.js` — same try/catch +
  `sendSuccess`/`handleControllerError` shape as `campaign.controller.js`.
- `backend/src/routes/persona-import.routes.js`, mounted under
  `/api/v1/gmail-connections/:gmailConnectionId/persona-import` (keeps account-scoping in the
  URL, matching PRD 5.1 — "every import is tied to a single `gmailAccountId`"):
  - `POST /` — start import (body: `{timePeriod}`) → returns draft set + first page of candidates
  - `GET /:setId/candidates` — paginated candidate list for the selection UI
  - `PATCH /:setId/candidates` — bulk selection update (body: `{updates: [{id, included}]}` or `{includeAll: true}`)
  - `POST /:setId/confirm` — confirm selection → returns summary (`selectedCount`) for the
    confirmation state (PRD step 8)
  - `GET /` — list this account's `PersonaSourceSet`s (draft + confirmed), for re-entering an
    in-progress draft or seeing import history
- `backend/src/validators/persona-import.validator.js` — Zod: `timePeriod` (preset enum ∪
  custom `{from, to}` with `superRefine` requiring both when `preset === "custom"`, `to > from`),
  `objectIdSchema` for `:gmailConnectionId`/`:setId` reusing the existing helper.
- `backend/src/dto/persona-import/persona-source-set-response.dto.js`,
  `persona-source-email-response.dto.js` — plain `toXDto()` functions per the existing
  convention; email DTO must never leak full recipient address (Q2) — expose `recipientDomain`
  only.
- Ownership check pattern: every repository call scoped `{_id, userId}` like
  `campaign.repository.js`; additionally verify `gmailConnectionId` belongs to `userId` before
  starting an import (reuse `gmailConnectionRepository`'s existing lookup).

### 3.5 Where the fetch actually runs

`startImport` can be slow (paginated `messages.list` + N `messages.get` calls against Gmail,
possibly hundreds of messages for a 12-month/all-time window). Two options:

- **Simple (recommended for this build):** run synchronously in the request handler with a
  generous timeout, since the PRD's own UX goal is "a few minutes, not scrolling entire
  history" — bound the fetch by capping max messages per import (e.g. 500) and let the
  time-period filter (5.2) do the heavy lifting of keeping the window small. Show a loading
  state client-side.
- **Deferred:** background worker job (there's already a worker pattern —
  `email.worker.js`/`gmail-sync.worker.js`/`campaign-scheduler.worker.js` — with SQS in front
  of the email queue). Only worth it if manual testing shows the synchronous path is too slow
  in practice.

Start with the synchronous approach; it's simpler, matches existing controller conventions,
and can be swapped for a queued job later without changing the data model or frontend contract
(the `draft` status already models "fetch in progress / not yet confirmed" either way).

---

## 4. Frontend implementation

Replace the stub `frontend/src/components/dashboard/AI-Persona.tsx` with a real, multi-step
flow living inside the AI Persona section, following the wizard conventions in
`campaign-configuration-page.tsx` (step sidebar, per-step validation, `persistStep`) but scaled
down to this PRD's 3 steps:

1. **Pick account** — if the user has >1 connected Gmail account, show a picker (reuse the list
   pattern from `gmail-connections-list.tsx`); each account's persona is independent (PRD 5.1).
   If exactly one connected account, skip straight to step 2.
2. **Time period + fetch** — preset radio/segmented control (3/6/12 months / all time, default
   6 months per PRD 5.2) + custom range date pickers. On submit, calls `POST .../persona-import`
   and transitions into the candidate list (loading state via `useMinLoadingDuration`, matching
   existing conventions).
3. **Select candidates** — scannable list (subject, recipient domain, date, snippet), each row
   using the existing `ui/checkbox.tsx` (already supports the indeterminate "select all" header
   state needed here), pre-checked per server-provided `included`. Running selected-count
   footer; soft warning banner under 10 selected (PRD 5.4). "Include all shown" bulk action →
   `PATCH .../candidates {includeAll:true}`. Confirm button → `POST .../confirm`.
4. **Confirmation state** — "N emails saved as training source for this account's AI Persona"
   (PRD step 8), with a way to start a new import later (creates a fresh `PersonaSourceSet`,
   doesn't touch the confirmed one — PRD 5.5).

New files, following the `gmail-connection.*` naming convention exactly:
- `frontend/src/types/persona-import.types.ts`
- `frontend/src/services/persona-import.service.ts` (`apiFetch` calls to the routes in §3.4)
- `frontend/src/store/slices/persona-import.slice.ts` (Redux Toolkit, `AsyncStatus` fields per
  action: `startImportStatus`, `updateSelectionStatus`, `confirmStatus`, matching the existing
  `status`/`error` naming idiom)
- `frontend/src/components/ai-persona/` — new directory for the step components (account
  picker, time-period form, candidate list + row, confirmation panel), keeping
  `AI-Persona.tsx` itself as the thin container that owns step state, mirroring how
  `campaign-configuration-page.tsx` is the container for its own step components.

`frontend/src/app/dashboard/ai-persona/page.tsx` stays essentially as-is (icon/title/description
props into the container) — no routing changes needed at the page level.

---

## 5. Explicitly not building (per PRD §3 and §7)

- No style/tone/objection-pattern extraction from selected emails.
- No embeddings/vectorization/RAG indexing.
- No persona generation or draft generation — nothing plugs into the Inbox reply flow yet.
- No incremental/repeat sync — every import is a fresh, independent `PersonaSourceSet`;
  "refresh my persona with new sent mail" is future work (§7) and needs no scaffolding now
  beyond the fact that the schema already supports multiple sets per connection.
- No cross-account aggregation — every query in §3 is scoped by a single `gmailConnectionId`.
- No user-configurable internal-domain list (Q3) — sender-domain inference only, for now.

---

## 6. Suggested build order

1. Backend models (`PersonaSourceSet`, `PersonaSourceEmail`) + `email-classification.util.js`
   with unit tests for the filter/dedupe rules in isolation (fast to get right before wiring
   Gmail calls).
2. `gmail.service.js`: `listSentMessages` + query builder.
3. `persona-import.service.js` orchestration + repositories.
4. Controller/routes/validators/DTOs, manually tested via REST client against a real connected
   account with real Sent history.
5. Frontend: slice/service/types, then step 2 (time period + fetch) and step 3 (selection list)
   UI, then step 1 (account picker, only if the test account has multiple connections) and step
   4 (confirmation).
6. End-to-end pass: connect a Gmail account with real sent mail, run the full flow, sanity-check
   that filtering/dedup results look reasonable, adjust thresholds in `email-classification.util.js`
   as needed.
