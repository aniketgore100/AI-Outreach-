function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A scheduled poll loop, not a queue consumer or part of EmailWorker — kept
 * as its own process (same reasoning as GmailSyncWorker, see
 * worker/gmail-sync.worker.js) so a scheduling bug can never take down
 * outbound sending or reply sync. Each pass delegates the actual "what's
 * due, what do I do about it" logic to CampaignSchedulerService#runCycle. */
class CampaignSchedulerWorker {
  constructor({ campaignSchedulerService, intervalMs }) {
    this.campaignSchedulerService = campaignSchedulerService;
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
    try {
      await this.campaignSchedulerService.runCycle();
    } catch (err) {
      // A single bad cycle (e.g. a transient DB blip) never stops the loop —
      // the next cycle just tries again.
      console.error("Campaign scheduler cycle failed:", err.message);
    }
  }
}

module.exports = { CampaignSchedulerWorker };
