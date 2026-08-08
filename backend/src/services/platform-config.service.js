const { PLATFORM_CONFIG_KEYS, PLATFORM_CONFIG_DEFAULTS } = require("../config/constants");
const { platformConfigRepository } = require("../repositories/platform-config.repository");

class PlatformConfigService {
  constructor(repository) {
    this.repository = repository;
  }

  /** Reads fresh from the database on every call (no cache) so a config
   * change takes effect on the very next request — no redeploy needed. */
  async getMaxGmailConnections() {
    const config = await this.repository.getByKey(PLATFORM_CONFIG_KEYS.MAX_GMAIL_CONNECTIONS_PER_USER);
    const value = config?.value;

    return typeof value === "number" && value > 0 ? value : PLATFORM_CONFIG_DEFAULTS.MAX_GMAIL_CONNECTIONS_PER_USER;
  }

  /** Seeds default config documents on boot so operators have a real record
   * to edit (mongosh, a future admin UI, etc.) instead of an invisible fallback. */
  async ensureDefaults() {
    await this.repository.upsertDefault(
      PLATFORM_CONFIG_KEYS.MAX_GMAIL_CONNECTIONS_PER_USER,
      PLATFORM_CONFIG_DEFAULTS.MAX_GMAIL_CONNECTIONS_PER_USER,
      "Maximum number of Gmail accounts a single user may connect at once."
    );
  }
}

const platformConfigService = new PlatformConfigService(platformConfigRepository);

module.exports = { PlatformConfigService, platformConfigService };
