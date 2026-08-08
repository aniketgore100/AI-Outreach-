const { decryptToken } = require("../utils/token-crypto.util");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function isPermanentError(err) {
  if (err?.permanent) return true;

  const status = Number(err?.response?.status ?? err?.code);
  if (!Number.isFinite(status)) return false;
  if (status === 429) return false;

  return status >= 400 && status < 500;
}

class EmailWorker {
  constructor({
    emailQueueService,
    emailJobRepository,
    gmailConnectionRepository,
    sendGmailMessage,
    rateLimiter,
    concurrency,
    visibilityTimeoutSeconds,
    waitTimeSeconds,
  }) {
    this.emailQueueService = emailQueueService;
    this.emailJobRepository = emailJobRepository;
    this.gmailConnectionRepository = gmailConnectionRepository;
    this.sendGmailMessage = sendGmailMessage;
    this.rateLimiter = rateLimiter;
    this.concurrency = concurrency;
    this.visibilityTimeoutSeconds = visibilityTimeoutSeconds;
    this.waitTimeSeconds = waitTimeSeconds;

    this.running = false;
    this.inFlight = new Set();
  }

  start() {
    this.running = true;
    this._loopPromise = this._loop();
  }


  async stop(timeoutMs) {
    this.running = false;
    await this._loopPromise;

    if (this.inFlight.size === 0) return;

    console.log(`Waiting for ${this.inFlight.size} in-flight email send(s) to finish...`);
    await Promise.race([Promise.allSettled(this.inFlight), sleep(timeoutMs)]);

    if (this.inFlight.size > 0) {
      console.warn(`${this.inFlight.size} email send(s) still in flight after ${timeoutMs}ms — exiting anyway`);
    }
  }

  async _loop() {
    while (this.running) {
      const freeSlots = this.concurrency - this.inFlight.size;

      if (freeSlots <= 0) {
        await Promise.race(this.inFlight);
        continue;
      }

      let messages;
      try {
        messages = await this.emailQueueService.receiveMessages({
          maxMessages: Math.min(10, freeSlots),
          waitTimeSeconds: this.waitTimeSeconds,
          visibilityTimeout: this.visibilityTimeoutSeconds,
        });
      } catch (err) {
        console.error("Failed to poll SQS — backing off:", err.message);
        await sleep(2000);
        continue;
      }

      for (const message of messages) {
        const task = this._processMessage(message)
          .catch((err) => console.error("Unhandled error processing email job message:", err))
          .finally(() => this.inFlight.delete(task));
        this.inFlight.add(task);
      }
    }
  }

  async _processMessage(message) {
    const receiveCount = Number(message.Attributes?.ApproximateReceiveCount ?? "1");

    let payload;
    try {
      payload = JSON.parse(message.Body);
    } catch {
      console.error(`Discarding unparseable SQS message ${message.MessageId}`);
      await this.emailQueueService.deleteMessage(message.ReceiptHandle);
      return;
    }

    await this.rateLimiter.acquire();

    const job = await this.emailJobRepository.markProcessing(payload.emailJobId);

    if (!job) {
 
      await this.emailQueueService.deleteMessage(message.ReceiptHandle);
      return;
    }

    try {
      const connection = await this.gmailConnectionRepository.findByIdForUser(job.gmailConnectionId, job.userId);

      if (!connection || connection.status !== "connected") {
        throw Object.assign(new Error("Gmail connection is no longer active"), { permanent: true });
      }

      const result = await this.sendGmailMessage({
        accessToken: decryptToken(connection.accessTokenEncrypted),
        refreshToken: decryptToken(connection.refreshTokenEncrypted),
        to: job.to,
        from: connection.email,
        subject: job.subject,
        text: job.body,
      });

      await this.emailJobRepository.markSent(job._id, { sqsMessageId: result?.id });
      await this.emailQueueService.deleteMessage(message.ReceiptHandle);
    } catch (err) {
      if (isPermanentError(err)) {
        console.error(`Email job ${job._id} failed permanently (attempt ${receiveCount}): ${err.message}`);
        await this.emailJobRepository.markDead(job._id, err.message);
   
        await this.emailQueueService.deleteMessage(message.ReceiptHandle);
        return;
      }

      console.error(`Email job ${job._id} failed transiently (attempt ${receiveCount}): ${err.message}`);
      await this.emailJobRepository.markFailed(job._id, err.message);

    }
  }
}

module.exports = { EmailWorker, isPermanentError };
