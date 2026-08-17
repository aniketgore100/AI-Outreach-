const { personaSourceSetRepository } = require("../repositories/persona-source-set.repository");
const { personaSourceEmailRepository } = require("../repositories/persona-source-email.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const gmailService = require("./gmail.service");
const { decryptToken } = require("../utils/token-crypto.util");
const { ApiError } = require("../utils/api-error");
const {
  extractDomain,
  extractFirstAddress,
  dedupeKey,
  classifySentEmail,
} = require("../utils/email-classification.util");
const { toPersonaSourceSetDto } = require("../dto/persona-import/persona-source-set-response.dto");
const { toPersonaSourceEmailDto } = require("../dto/persona-import/persona-source-email-response.dto");
const { PERSONA_SOURCE_SET_STATUS, PERSONA_TIME_PERIOD_PRESET, PERSONA_IMPORT_LIMITS } = require("../config/constants");

const FETCH_CONCURRENCY = 10;

const PRESET_LOOKBACK_MONTHS = {
  [PERSONA_TIME_PERIOD_PRESET.THREE_MONTHS]: 3,
  [PERSONA_TIME_PERIOD_PRESET.SIX_MONTHS]: 6,
  [PERSONA_TIME_PERIOD_PRESET.TWELVE_MONTHS]: 12,
};

function resolveTimePeriodRange({ preset, from, to }) {
  if (preset === PERSONA_TIME_PERIOD_PRESET.CUSTOM) {
    return { after: from, before: to };
  }

  if (preset === PERSONA_TIME_PERIOD_PRESET.ALL_TIME) {
    return { after: null, before: null };
  }

  const after = new Date();
  after.setMonth(after.getMonth() - PRESET_LOOKBACK_MONTHS[preset]);
  return { after, before: null };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

class PersonaImportService {
  constructor(personaSourceSets, personaSourceEmails, gmailConnections, gmail) {
    this.personaSourceSets = personaSourceSets;
    this.personaSourceEmails = personaSourceEmails;
    this.gmailConnections = gmailConnections;
    this.gmail = gmail;
  }

  async _getOwnedConnection(userId, gmailConnectionId) {
    const connection = await this.gmailConnections.findByIdForUser(gmailConnectionId, userId);

    if (!connection) {
      throw ApiError.notFound("Gmail connection not found");
    }

    if (connection.status !== "connected") {
      throw ApiError.badRequest("This Gmail account is not connected");
    }

    return connection;
  }

  async _getOwnedSet(userId, setId) {
    const set = await this.personaSourceSets.findByIdForUser(setId, userId);

    if (!set) {
      throw ApiError.notFound("Persona source set not found");
    }

    return set;
  }

  _assertDraft(set) {
    if (set.status !== PERSONA_SOURCE_SET_STATUS.DRAFT) {
      throw ApiError.conflict("This import has already been confirmed");
    }
  }

  async _collectSentMessageIds({ accessToken, refreshToken, after, before }) {
    const ids = [];
    let pageToken;

    do {
      const page = await this.gmail.listSentMessages({ accessToken, refreshToken, after, before, pageToken });
      ids.push(...(page.messages || []).map((message) => message.id));
      pageToken = page.nextPageToken;
    } while (pageToken && ids.length < PERSONA_IMPORT_LIMITS.MAX_MESSAGES_PER_IMPORT);

    return ids.slice(0, PERSONA_IMPORT_LIMITS.MAX_MESSAGES_PER_IMPORT);
  }

  async startImport(userId, gmailConnectionId, dto) {
    const connection = await this._getOwnedConnection(userId, gmailConnectionId);
    const accessToken = decryptToken(connection.accessTokenEncrypted);
    const refreshToken = decryptToken(connection.refreshTokenEncrypted);
    const senderDomain = extractDomain(connection.email);

    const { after, before } = resolveTimePeriodRange(dto.timePeriod);

    const set = await this.personaSourceSets.create({
      userId,
      gmailConnectionId,
      status: PERSONA_SOURCE_SET_STATUS.DRAFT,
      timePeriod: { preset: dto.timePeriod.preset, from: after ?? null, to: before ?? null },
    });

    const messageIds = await this._collectSentMessageIds({ accessToken, refreshToken, after, before });

    const messages = await mapWithConcurrency(messageIds, FETCH_CONCURRENCY, (messageId) =>
      this.gmail.getMessage({ accessToken, refreshToken, messageId }).catch(() => null)
    );

    const grouped = new Map();
    for (const message of messages) {
      if (!message) continue;

      const recipientDomain = extractDomain(extractFirstAddress(message.to));
      if (!recipientDomain) continue;

      const key = dedupeKey(message.subject, message.bodyText);
      const existing = grouped.get(key);

      if (existing) {
        existing.duplicateCount += 1;
        continue;
      }

      grouped.set(key, {
        gmailMessageId: message.id,
        subject: message.subject || "",
        bodyText: message.bodyText || "",
        snippet: message.snippet || "",
        fromEmail: message.from || "",
        recipientDomain,
        sentAt: message.internalDate || new Date(),
        duplicateCount: 1,
      });
    }

    const docs = Array.from(grouped.values()).map((candidate) => {
      const filterReason = classifySentEmail({
        subject: candidate.subject,
        bodyText: candidate.bodyText,
        fromEmail: candidate.fromEmail,
        recipientDomain: candidate.recipientDomain,
        senderDomain,
      });

      return {
        personaSourceSetId: set._id,
        gmailConnectionId,
        gmailMessageId: candidate.gmailMessageId,
        subject: candidate.subject,
        bodyText: candidate.bodyText,
        snippet: candidate.snippet,
        recipientDomain: candidate.recipientDomain,
        duplicateCount: candidate.duplicateCount,
        sentAt: candidate.sentAt,
        filterReason,
        included: !filterReason,
      };
    });

    await this.personaSourceEmails.insertMany(docs);

    const updatedSet = await this.personaSourceSets.updateByIdForUser(set._id, userId, {
      candidateCount: docs.length,
    });

    return toPersonaSourceSetDto(updatedSet);
  }

  async listCandidates(userId, setId, { page, limit }) {
    const set = await this._getOwnedSet(userId, setId);
    const { items, total } = await this.personaSourceEmails.listForSet(set._id, { page, limit });

    return {
      set: toPersonaSourceSetDto(set),
      items: items.map(toPersonaSourceEmailDto),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async updateSelection(userId, setId, dto) {
    const set = await this._getOwnedSet(userId, setId);
    this._assertDraft(set);

    if (dto.includeAll !== undefined) {
      await this.personaSourceEmails.includeAllForSet(set._id, dto.includeAll);
    }

    if (dto.updates?.length) {
      const toInclude = dto.updates.filter((update) => update.included).map((update) => update.id);
      const toExclude = dto.updates.filter((update) => !update.included).map((update) => update.id);

      if (toInclude.length) await this.personaSourceEmails.setIncludedMany(toInclude, set._id, true);
      if (toExclude.length) await this.personaSourceEmails.setIncludedMany(toExclude, set._id, false);
    }

    const selectedCount = await this.personaSourceEmails.countIncludedForSet(set._id);
    return { selectedCount };
  }

  async confirmImport(userId, setId) {
    const set = await this._getOwnedSet(userId, setId);
    this._assertDraft(set);

    const selectedCount = await this.personaSourceEmails.countIncludedForSet(set._id);

    const confirmed = await this.personaSourceSets.updateByIdForUser(set._id, userId, {
      status: PERSONA_SOURCE_SET_STATUS.CONFIRMED,
      confirmedAt: new Date(),
      selectedCount,
    });

    return toPersonaSourceSetDto(confirmed);
  }

  async listSets(userId, gmailConnectionId) {
    await this._getOwnedConnection(userId, gmailConnectionId);
    const sets = await this.personaSourceSets.listForConnection(gmailConnectionId, userId);
    return sets.map(toPersonaSourceSetDto);
  }
}

const personaImportService = new PersonaImportService(
  personaSourceSetRepository,
  personaSourceEmailRepository,
  gmailConnectionRepository,
  gmailService
);

module.exports = { PersonaImportService, personaImportService };
