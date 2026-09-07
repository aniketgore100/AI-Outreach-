const crypto = require("node:crypto");

const { google } = require("googleapis");

const { env } = require("../config/env");

const createGmailClient = ({
    accessToken,
    refreshToken,
}) => {
    const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_OAUTH_CLIENT_ID,
        env.GOOGLE_OAUTH_CLIENT_SECRET,
        env.GOOGLE_OAUTH_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return google.gmail({ version: "v1", auth: oauth2Client });
}

const encodeMessage = (message) => {
    return Buffer.from(message).toString("base64url");
}

const stripHtml = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Plain text when there's no HTML (unchanged behavior for the campaign
 * worker), or a text+HTML multipart/alternative when there is — Gmail (and
 * every other mail client) falls back to the plain-text part when it can't
 * render HTML, so rich-text templates still land as readable email.
 * `inReplyTo`/`references` (RFC822 Message-ID values, e.g. "<abc@mail.gmail.com>")
 * thread the message for clients that read those headers — Gmail itself
 * threads primarily off the `threadId` passed separately to messages.send. */
const buildRawMessage = ({ to, from, subject, text, html, inReplyTo, references }) => {
  const headers = [`To: ${to}`, `From: ${from}`, `Subject: ${subject}`, "MIME-Version: 1.0"];

  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  if (!html) {
    return [...headers, "Content-Type: text/plain; charset=utf-8", "", text ?? ""].join("\r\n");
  }

  const boundary = `mixed_${crypto.randomBytes(12).toString("hex")}`;
  const plainText = text ?? stripHtml(html);

  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    plainText,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
};

/** `threadId` attaches the send to an existing Gmail thread (the mechanism
 * Gmail's own API relies on for threading); `inReplyTo`/`references` are the
 * RFC822 Message-ID header values of the message being replied to. Omit all
 * three for a brand-new outreach message. Response includes `id`/`threadId`
 * for the message we just created. */
const sendMessage = async ({
  accessToken,
  refreshToken,
  to,
  from,
  subject,
  text,
  html,
  threadId,
  inReplyTo,
  references,
}) => {
  const gmail = createGmailClient({ accessToken, refreshToken });

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(buildRawMessage({ to, from, subject, text, html, inReplyTo, references })),
      ...(threadId ? { threadId } : {}),
    },
  });

  return response.data;
};

/** Current mailbox historyId — the starting cursor for `listHistory` deltas.
 * Used to bootstrap sync for a connection with no cursor yet, rather than
 * walking the account's entire history. */
const getProfile = async ({ accessToken, refreshToken }) => {
  const gmail = createGmailClient({ accessToken, refreshToken });
  const response = await gmail.users.getProfile({ userId: "me" });
  return response.data;
};

/** Delta sync: everything that changed in the mailbox since `startHistoryId`.
 * Gmail only retains ~7 days of history — an old/expired startHistoryId
 * throws (404), which callers should treat as "re-bootstrap the cursor". */
const listHistory = async ({ accessToken, refreshToken, startHistoryId, pageToken }) => {
  const gmail = createGmailClient({ accessToken, refreshToken });
  const response = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    pageToken,
    maxResults: 100,
  });
  return response.data;
};

/** Gmail search operators take epoch seconds, not milliseconds. */
function buildSentQuery({ after, before }) {
  const parts = ["in:sent"];
  if (after) parts.push(`after:${Math.floor(new Date(after).getTime() / 1000)}`);
  if (before) parts.push(`before:${Math.floor(new Date(before).getTime() / 1000)}`);
  return parts.join(" ");
}

/** One page of Sent-folder message ids within an optional date window.
 * `messages.list` only returns `{id, threadId}` — callers fetch/parse each
 * one with `getMessage` below. */
const listSentMessages = async ({ accessToken, refreshToken, after, before, pageToken }) => {
  const gmail = createGmailClient({ accessToken, refreshToken });
  const response = await gmail.users.messages.list({
    userId: "me",
    q: buildSentQuery({ after, before }),
    pageToken,
    maxResults: 100,
  });
  return response.data;
};

function decodeBase64Url(data) {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function extractHeader(headers, name) {
  const header = headers?.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}

/** Walks a (possibly multipart) message payload and returns the first
 * text/plain and text/html parts found, ignoring attachments (which carry
 * an attachmentId instead of inline body data). */
function extractBodies(payload) {
  let text = "";
  let html = "";

  function walk(part) {
    if (!part) return;

    if (part.mimeType === "text/plain" && part.body?.data && !text) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data && !html) {
      html = decodeBase64Url(part.body.data);
    }

    if (Array.isArray(part.parts)) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);
  return { text, html };
}

/** Fetches and normalizes a single message for persistence — resolves the
 * RFC822 Message-ID/In-Reply-To/References headers needed for our own
 * threading, plus decoded plain-text/HTML bodies. */
const getMessage = async ({ accessToken, refreshToken, messageId }) => {
  const gmail = createGmailClient({ accessToken, refreshToken });
  const response = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const message = response.data;
  const headers = message.payload?.headers ?? [];
  const { text, html } = extractBodies(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet ?? "",
    internalDate: message.internalDate ? new Date(Number(message.internalDate)) : null,
    from: extractHeader(headers, "From"),
    to: extractHeader(headers, "To"),
    subject: extractHeader(headers, "Subject"),
    rfc822MessageId: extractHeader(headers, "Message-Id"),
    inReplyTo: extractHeader(headers, "In-Reply-To"),
    references: extractHeader(headers, "References"),
    bodyText: text,
    bodyHtml: html,
  };
};

module.exports = { sendMessage, getProfile, listHistory, listSentMessages, getMessage };
