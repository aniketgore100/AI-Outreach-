const {
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} = require("@aws-sdk/client-sqs");

const { sqsClient } = require("../config/aws");
const { env } = require("../config/env");
const { ApiError } = require("../utils/api-error");
const { SQS_MESSAGE_TYPES } = require("../config/constants");

const SEND_BATCH_SIZE = 10;

function assertQueueConfigured() {
  if (!env.SQS_EMAIL_QUEUE_URL) {
    throw ApiError.internal("SQS_EMAIL_QUEUE_URL is not configured — run scripts/setup-sqs.js and set it");
  }
}

/** AWS requires FIFO queue names (and therefore their URLs) to end in
 * ".fifo" — a reliable way to tell whether SQS_EMAIL_QUEUE_URL points at a
 * FIFO queue (as opposed to the standard queue scripts/setup-sqs.js
 * provisions), since FIFO and standard queues take different parameters on
 * SendMessageBatch (FIFO *requires* MessageGroupId/MessageDeduplicationId;
 * standard *rejects* them). */
function isFifoQueue() {
  return env.SQS_EMAIL_QUEUE_URL?.endsWith(".fifo") ?? false;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

class EmailQueueService {
  constructor(client) {
    this.client = client;
  }


  async enqueueEmailJobs(emailJobIds) {
    assertQueueConfigured();

    const batches = chunk(emailJobIds, SEND_BATCH_SIZE);
    const successIds = [];
    const failed = [];
    const fifo = isFifoQueue();

    for (const batch of batches) {
      const command = new SendMessageBatchCommand({
        QueueUrl: env.SQS_EMAIL_QUEUE_URL,
        Entries: batch.map((emailJobId) => ({
          Id: emailJobId.toString(),
          MessageBody: JSON.stringify({
            type: SQS_MESSAGE_TYPES.SEND_EMAIL,
            emailJobId: emailJobId.toString(),
          }),
          // Each job gets its own group so FIFO ordering (which we don't
          // need across different jobs) never serializes the whole queue
          // down to one message at a time. Reusing the job id as the
          // dedup id is a free extra safety net on top of our own
          // idempotencyKey-based dedup.
          ...(fifo
            ? { MessageGroupId: emailJobId.toString(), MessageDeduplicationId: emailJobId.toString() }
            : {}),
        })),
      });

      const response = await this.client.send(command);
      successIds.push(...(response.Successful ?? []).map((entry) => entry.Id));
      failed.push(...(response.Failed ?? []));
    }

    return { successIds, successCount: successIds.length, failed };
  }

  async receiveMessages({ maxMessages, waitTimeSeconds, visibilityTimeout }) {
    assertQueueConfigured();

    const command = new ReceiveMessageCommand({
      QueueUrl: env.SQS_EMAIL_QUEUE_URL,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: visibilityTimeout,
      AttributeNames: ["ApproximateReceiveCount"],
    });

    const response = await this.client.send(command);
    return response.Messages ?? [];
  }

  async deleteMessage(receiptHandle) {
    assertQueueConfigured();
    await this.client.send(
      new DeleteMessageCommand({ QueueUrl: env.SQS_EMAIL_QUEUE_URL, ReceiptHandle: receiptHandle })
    );
  }

  async changeMessageVisibility(receiptHandle, visibilityTimeoutSeconds) {
    assertQueueConfigured();
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: env.SQS_EMAIL_QUEUE_URL,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      })
    );
  }
}

const emailQueueService = new EmailQueueService(sqsClient);

module.exports = { EmailQueueService, emailQueueService };
