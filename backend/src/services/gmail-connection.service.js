const jwt = require("jsonwebtoken");

const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { platformConfigService } = require("./platform-config.service");
const { ApiError } = require("../utils/api-error");
const { encryptToken, decryptToken } = require("../utils/token-crypto.util");
const { toGmailConnectionDto } = require("../dto/gmail-connection/gmail-connection-response.dto");
const { env } = require("../config/env");

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const GOOGLE_OAUTH_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  // Needed to detect and read replies to outreach threads. Accounts
  // connected before this scope was added only ever granted gmail.send and
  // must reconnect — their stored tokens simply can't read mail.
  GMAIL_READONLY_SCOPE,
];

/** Connections made before `scope` was tracked (or that pre-date the
 * readonly scope being requested) have no record of it — treated as
 * missing, since their stored tokens can't actually read mail either way. */
function hasReadonlyScope(connection) {
  return Boolean(connection.scope && connection.scope.split(" ").includes(GMAIL_READONLY_SCOPE));
}

function assertGoogleOAuthConfig() {
  const missing = [
    ["GOOGLE_OAUTH_CLIENT_ID", env.GOOGLE_OAUTH_CLIENT_ID],
    ["GOOGLE_OAUTH_CLIENT_SECRET", env.GOOGLE_OAUTH_CLIENT_SECRET],
    ["GOOGLE_OAUTH_REDIRECT_URI", env.GOOGLE_OAUTH_REDIRECT_URI],
    ["GOOGLE_OAUTH_STATE_SECRET", env.GOOGLE_OAUTH_STATE_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw ApiError.badRequest(`Google OAuth is not configured yet. Missing: ${missing.join(", ")}`);
  }
}

async function readJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error_description || payload?.error || fallbackMessage;
    throw ApiError.badRequest(message);
  }

  return payload;
}

async function revokeGoogleToken(token) {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token }),
  });

  if (response.ok) {
    return;
  }

  const payload = await response.json().catch(() => null);
  const message = payload?.error_description || payload?.error || "Failed to revoke Google token";

  if (response.status === 400 && String(message).toLowerCase().includes("invalid_token")) {
    return;
  }

  throw ApiError.badRequest(message);
}

class GmailConnectionService {
  constructor(repository, configService) {
    this.repository = repository;
    this.configService = configService;
  }

  async listForUser(userId) {
    const [connections, limit] = await Promise.all([
      this.repository.listForUser(userId),
      this.configService.getMaxGmailConnections(),
    ]);

    const used = connections.filter((connection) => connection.status === "connected").length;

    return {
      connections: connections.map(toGmailConnectionDto),
      limit,
      used,
    };
  }

  buildAuthorizationUrl({ userId, loginHint }) {
    assertGoogleOAuthConfig();

    const state = jwt.sign({ userId }, env.GOOGLE_OAUTH_STATE_SECRET, { expiresIn: "10m" });
    const params = new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      response_type: "code",
      scope: GOOGLE_OAUTH_SCOPE.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    if (loginHint) {
      params.set("login_hint", loginHint);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async startGoogleOAuth(userId, loginHint) {
    return {
      authorizationUrl: this.buildAuthorizationUrl({ userId, loginHint }),
    };
  }

  async handleGoogleOAuthCallback(code, state) {
    assertGoogleOAuthConfig();

    if (!code) {
      throw ApiError.badRequest("Missing Google authorization code");
    }

    if (!state) {
      throw ApiError.badRequest("Missing Google OAuth state");
    }

    let payload;
    try {
      payload = jwt.verify(state, env.GOOGLE_OAUTH_STATE_SECRET);
    } catch {
      throw ApiError.badRequest("Google OAuth session expired. Please try connecting again.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await readJsonResponse(tokenResponse, "Failed to exchange Google authorization code");

    if (!tokenData.id_token) {
      throw ApiError.badRequest("Google did not return an ID token");
    }

    const identityResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
    const identity = await readJsonResponse(identityResponse, "Failed to verify Google account");

    if (identity.aud !== env.GOOGLE_OAUTH_CLIENT_ID) {
      throw ApiError.badRequest("Google account verification failed");
    }

    if (String(identity.email_verified) !== "true") {
      throw ApiError.badRequest("Google account email is not verified");
    }

    if (payload.userId && identity.sub) {
      const normalizedEmail = String(identity.email ?? "").toLowerCase();
      const googleAccountId = identity.sub;
      const limit = await this.configService.getMaxGmailConnections();
      const activeCount = await this.repository.countActiveForUser(payload.userId);
      const existing = await this.repository.findByUserAndGoogleAccountId(payload.userId, googleAccountId);

      const tokenPayload = {
        email: normalizedEmail,
        accessTokenEncrypted: encryptToken(tokenData.access_token),
        scope: tokenData.scope ?? null,
      };

      if (existing) {
        if (existing.status === "connected") {
          throw ApiError.conflict("This Google account is already connected.");
        }

        const reactivated = await this.repository.reactivate(existing._id, {
          ...tokenPayload,
          refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : existing.refreshTokenEncrypted,
        });
        return toGmailConnectionDto(reactivated);
      }

      if (activeCount >= limit) {
        throw ApiError.conflict(`You've reached the maximum of ${limit} connected Gmail accounts.`);
      }

      if (!tokenData.refresh_token) {
        throw ApiError.badRequest("Google did not return a refresh token. Please revoke the app and connect again.");
      }

      const created = await this.repository.create({
        userId: payload.userId,
        googleAccountId,
        ...tokenPayload,
        refreshTokenEncrypted: encryptToken(tokenData.refresh_token),
      });
      return toGmailConnectionDto(created);
    }

    throw ApiError.badRequest("Invalid Google OAuth session");
  }

  async disconnect(userId, connectionId) {
    const connection = await this.repository.findByIdForUser(connectionId, userId);

    if (!connection) {
      throw ApiError.notFound("Gmail connection not found");
    }

    const tokenToRevoke = (() => {
      if (connection.refreshTokenEncrypted) {
        return decryptToken(connection.refreshTokenEncrypted);
      }

      if (connection.accessTokenEncrypted) {
        return decryptToken(connection.accessTokenEncrypted);
      }

      return null;
    })();

    if (tokenToRevoke) {
      await revokeGoogleToken(tokenToRevoke);
    }

    const updated = await this.repository.disconnect(connectionId);
    return toGmailConnectionDto(updated);
  }
}

const gmailConnectionService = new GmailConnectionService(gmailConnectionRepository, platformConfigService);

module.exports = { GmailConnectionService, gmailConnectionService, hasReadonlyScope, GMAIL_READONLY_SCOPE };
