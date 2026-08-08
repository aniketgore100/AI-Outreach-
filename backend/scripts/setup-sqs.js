/** One-time (and safely re-runnable) infra script: provisions the DLQ, then
 * the main email-send queue wired to redrive into it. Run with
 * `npm run sqs:setup`, then copy the two printed URLs into .env. */
const {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
} = require("@aws-sdk/client-sqs");

const { env } = require("../src/config/env");

const client = new SQSClient({
  region: env.AWS_REGION,
  ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } }
    : {}),
});

/** CreateQueue is itself idempotent when the attributes match an existing
 * queue of the same name — re-running this script is safe. If the queue
 * exists with *different* attributes AWS rejects the call, so we fall back
 * to just looking it up (and warn that attributes weren't updated). */
async function ensureQueue(name, attributes) {
  try {
    const { QueueUrl } = await client.send(new CreateQueueCommand({ QueueName: name, Attributes: attributes }));
    return QueueUrl;
  } catch (err) {
    if (err.name === "QueueNameExists") {
      console.warn(`Queue "${name}" already exists with different attributes — reusing it as-is.`);
      const { QueueUrl } = await client.send(new GetQueueUrlCommand({ QueueName: name }));
      return QueueUrl;
    }

    throw err;
  }
}

async function getQueueArn(queueUrl) {
  const { Attributes } = await client.send(
    new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["QueueArn"] })
  );
  return Attributes.QueueArn;
}

async function main() {
  console.log(`Provisioning SQS queues in ${env.AWS_REGION}...`);

  const dlqUrl = await ensureQueue(env.SQS_EMAIL_DLQ_NAME, {
    MessageRetentionPeriod: String(env.SQS_DLQ_MESSAGE_RETENTION_SECONDS),
  });
  const dlqArn = await getQueueArn(dlqUrl);
  console.log(`DLQ ready:   ${dlqUrl}`);

  const queueUrl = await ensureQueue(env.SQS_EMAIL_QUEUE_NAME, {
    VisibilityTimeout: String(env.SQS_VISIBILITY_TIMEOUT_SECONDS),
    MessageRetentionPeriod: String(env.SQS_MESSAGE_RETENTION_SECONDS),
    ReceiveMessageWaitTimeSeconds: String(env.SQS_WAIT_TIME_SECONDS),
    RedrivePolicy: JSON.stringify({
      deadLetterTargetArn: dlqArn,
      maxReceiveCount: env.SQS_MAX_RECEIVE_COUNT,
    }),
  });
  console.log(`Queue ready: ${queueUrl}`);

  console.log("\nAdd these to your .env:");
  console.log(`SQS_EMAIL_QUEUE_URL=${queueUrl}`);
  console.log(`SQS_EMAIL_DLQ_URL=${dlqUrl}`);
}

main().catch((err) => {
  console.error("Failed to provision SQS queues:", err);
  process.exit(1);
});
