function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A scheduled poll loop, not a queue consumer — deliberately separate from
 * EmailWorker (see worker/email.worker.js) so a bug here can never take
 * outbound sending down with it. Each pass syncs every connected Gmail
 * account in turn via ConversationService#syncConnection. */
class GmailSyncWorker {
  constructor({ gmailConnectionRepository, conversationService, intervalMs }) {
    this.gmailConnectionRepository = gmailConnectionRepository;
    this.conversationService = conversationService;
    this.intervalMs = intervalMs;

    this.running = false;
  }

  start() {
    this.running = true;
    this._loopPromise = this._loop();
  }

  async stop(timeoutMs) {
    this.running = false;
    await Promise.race([this._loopPromise, sleep(timeoutMs)]);
  }

  async _loop() {
    while (this.running) {
      await this._runPass();
      if (!this.running) return;
      await sleep(this.intervalMs);
    }
  }

  async _runPass() {
    let connections;
    try {
      connections = await this.gmailConnectionRepository.listConnected();
    } catch (err) {
      console.error("Failed to list connected Gmail accounts for sync:", err.message);
      return;
    }

    for (const connection of connections) {
      if (!this.running) return;

      try {
        const result = await this.conversationService.syncConnection(connection);
        if (result.syncedMessages > 0) {
          console.log(`Gmail sync: ${result.syncedMessages} new message(s) for ${connection.email}`);
        }
      } catch (err) {
        // Insufficient scope (pre-gmail.readonly connections that haven't
        // reconnected yet) and any other per-account failure just skip that
        // account this pass — never let one bad connection stop the rest.
        console.error(`Gmail sync failed for ${connection.email} (${connection._id}):`, err.message);
      }
    }
  }
}

module.exports = { GmailSyncWorker };
