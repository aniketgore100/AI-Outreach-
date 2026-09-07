# Security & Production-Readiness Plan

Findings from the backend audit (security, scalability, code quality). Tracked here for future fixes — nothing in this file has been implemented yet.

## Must-fix before production

### 1. No rate limiting on send-capable endpoints
- **Severity:** High (security)
- **Where:** `template.controller.js` (`sendTest`), `conversation.controller.js` (`reply`), `campaign.controller.js` (`activate`)
- **Risk:** Only `/auth/*` routes have rate limiting (`rate-limit.middleware.js`). An attacker with a valid session (or a compromised account) can hammer these endpoints to burn Gmail send quota, get the connected Gmail account flagged/suspended by Google, or use the platform as a spam relay.
- **Fix direction:** Add a per-user rate limiter to `send-test`, `reply`, and `activate` routes.

### 2. Unescaped merge fields → stored HTML/XSS
- **Severity:** Medium-High (security)
- **Where:** `src/utils/template.util.js` (`renderTemplate`)
- **Risk:** Lead fields from CSV imports (company name, job title, etc.) are interpolated raw into `bodyHtml` with no HTML-escaping. A malicious lead row (e.g. `companyName = "<img src=x onerror=...>"`) becomes live HTML in sent emails and in-app previews (stored XSS if the frontend renders `bodyHtml` via `dangerouslySetInnerHTML`).
- **Fix direction:** HTML-escape merge field values before interpolation.

### 3. Mongo connection pool unconfigured
- **Severity:** High (scalability)
- **Where:** `src/config/database.js` — `mongoose.connect(env.MONGODB_URI)`
- **Risk:** No `maxPoolSize`, `serverSelectionTimeoutMS`, or `socketTimeoutMS` set. A network blip can hang a connection indefinitely; default pool size × N horizontally-scaled replicas can exhaust the DB's connection limit under load.
- **Fix direction:** Set explicit `maxPoolSize`, `serverSelectionTimeoutMS`, `socketTimeoutMS`, sized for expected replica count.

### 4. Gmail sync worker doesn't scale
- **Severity:** Medium-High (scalability)
- **Where:** `src/repositories/gmail-connection.repository.js` (`listConnected` — no pagination), `src/worker/gmail-sync.worker.js`
- **Risk:** Processes every connected account serially, once per sync interval (60s default). At a few thousand accounts, one pass won't finish before the next starts. Running multiple sync-worker replicas makes each one re-sync *every* account, multiplying Gmail API quota usage (no sharding/leader-election).
- **Fix direction:** Paginate `listConnected`, parallelize with bounded concurrency, partition accounts across replicas if scaled horizontally.

### 5. Send-rate limiter is per-process, not cluster-aware
- **Severity:** Medium (scalability)
- **Where:** `src/worker/rate-limiter.util.js`, instantiated once per `email.worker.js` process
- **Risk:** Correctly throttles a single worker instance, but running 2+ email-worker replicas multiplies the effective Gmail send rate (`WORKER_RATE_LIMIT_PER_SECOND` × replica count) against Gmail's per-account API quota.
- **Fix direction:** Move rate limiting to a shared store (Redis), or budget the per-process rate down based on replica count.

## Should-fix soon (not launch blockers)

- **Refresh-token reuse detection** — `auth.service.js`: a stolen refresh token is silently revoked on reuse, but the victim's whole session/token family isn't invalidated and no alert fires. Theft is currently undetectable.
- **No timeout on outbound Gmail API calls** — `gmail.service.js` (`sendMessage`, `getProfile`, `listHistory`, `getMessage`) has no HTTP timeout; a stalled call can hold a worker slot indefinitely.
- **Unbounded `Message.find` per conversation** — `message.repository.js:18` fetches every message in a thread with no cap.
- **Encryption key derivation** — `token-crypto.util.js`: key is derived via plain SHA-256 of `GMAIL_TOKEN_ENCRYPTION_KEY` rather than a KDF (PBKDF2/scrypt). Fine if the env var is high-entropy, but shouldn't be a human-chosen passphrase.
- **`CORS_ORIGIN` config hardening** — `app.js`: currently a single explicit origin (fine), but not validated as a URL/allowlist at startup — add a startup assertion so it can never silently become `*` with `credentials: true`.

## Minor cleanup (code quality, low priority)

- `buildPagination({page, limit, total})` is copy-pasted verbatim in `campaign.service.js`, `conversation.service.js`, `lead-list.service.js`, and `template.service.js` — extract to `src/utils/`.
- `handle-controller-error.js` and `error.middleware.js` (`normalizeError`) have overlapping error-formatting logic that could be consolidated.
- The three worker entrypoints (`worker/index.js`, `worker/sync-index.js`, `worker/campaign-scheduler-index.js`) share near-identical bootstrap/shutdown boilerplate — could be factored into a shared `bootstrapWorker()` helper.

## Already solid (no action needed)

- Encrypted-at-rest Gmail OAuth tokens (AES-256-GCM, per-record IV, auth tag verified on decrypt).
- Hashed + rotated refresh tokens.
- Correct cookie flags (`httpOnly`, `secure` in production, `sameSite: lax`).
- No IDOR found — every repository read/write is scoped to `req.user.id`.
- No injection vectors — no `eval`/`child_process`/dynamic `require`; regex search inputs are escaped.
- `helmet`, `cors`, `compression`, per-route body-size limits configured correctly in `app.js`.
- Errors collapse to a generic message in production; stack traces never reach the client.
- SQS-backed email queue with idempotency keys (`EmailJob.idempotencyKey`) — safe against duplicate delivery.
- Atomic CAS-based campaign scheduler concurrency control (`findOneAndUpdate`) — safe against duplicate sends across scheduler replicas.
- List endpoints (leads, campaigns, templates, conversations, lead lists) all paginate with Zod-capped limits.
- CSV/lead import capped at 20,000 rows / 15MB body.
- Graceful shutdown implemented correctly across the API server and all three workers (SIGTERM/SIGINT drain + force-exit timeout).
