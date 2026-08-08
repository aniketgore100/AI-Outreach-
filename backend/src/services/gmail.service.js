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
 * render HTML, so rich-text templates still land as readable email. */
const buildRawMessage = ({ to, from, subject, text, html }) => {
  const headers = [`To: ${to}`, `From: ${from}`, `Subject: ${subject}`, "MIME-Version: 1.0"];

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

const sendMessage = async ({
  accessToken,
  refreshToken,
  to,
  from,
  subject,
  text,
  html,
}) => {
  const gmail = createGmailClient({ accessToken, refreshToken });

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(buildRawMessage({ to, from, subject, text, html })),
    },
  });

  return response.data;
};

module.exports = { sendMessage };
