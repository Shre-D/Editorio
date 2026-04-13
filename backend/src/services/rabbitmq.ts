import amqp, { Channel } from 'amqplib';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection | null = null;
let channel: Channel | null = null;

export const QUEUES = {
  DOCUMENT_SAVE: 'document_save',
  NOTIFICATIONS: 'notifications',
} as const;

type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

interface DocumentSaveMessage {
  roomId: string;
  content: Buffer;
  timestamp: number;
}

export const connect = async (): Promise<Channel | undefined> => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    channel = await connection.createChannel();

    // Assert queues
    await channel.assertQueue(QUEUES.DOCUMENT_SAVE, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATIONS, { durable: true });

    console.log('🐰 Connected to RabbitMQ');

    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed, reconnecting...');
      setTimeout(connect, 5000);
    });

    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connect, 5000);
    return undefined;
  }
};

export const publishMessage = async <T>(queue: QueueName, message: T): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
};

export const consumeMessages = async <T>(
  queue: QueueName,
  callback: (content: T) => Promise<void>
): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  await channel.consume(queue, async (msg) => {
    if (msg && channel) {
      try {
        const content = JSON.parse(msg.content.toString()) as T;
        await callback(content);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        channel.nack(msg, false, false);
      }
    }
  });
};

export const queueDocumentSave = async (roomId: string, content: Buffer): Promise<void> => {
  const message: DocumentSaveMessage = { roomId, content, timestamp: Date.now() };
  await publishMessage(QUEUES.DOCUMENT_SAVE, message);
};

export default { connect, publishMessage, consumeMessages, queueDocumentSave, QUEUES };
