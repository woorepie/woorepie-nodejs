import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  clientId: 'dlq-producer'
});

const producer = kafka.producer();

export const sendToDLQ = async (originalTopic, message, error) => {
  try {
    await producer.connect();
    
    // 메시지에서 customerId 추출
    let customerId = 'unknown';
    try {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      customerId = parsedMessage.customerId || parsedMessage.buyerId || parsedMessage.sellerId || 'unknown';
    } catch (e) {
      console.log('Failed to parse message for customerId extraction:', e.message);
    }
    
    const dlqMessage = {
      originalTopic,
      originalMessage: message,
      error: error.message,
      timestamp: new Date().toISOString(),
      customerId
    };

    await producer.send({
      topic: `${originalTopic}.dlq`,
      messages: [
        {
          value: JSON.stringify(dlqMessage)
        }
      ]
    });

    console.log(`Message sent to DLQ: ${originalTopic}.dlq`);
  } catch (err) {
    console.error('Error sending to DLQ:', err);
  } finally {
    await producer.disconnect();
  }
}; 