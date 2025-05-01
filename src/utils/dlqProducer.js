import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  clientId: 'dlq-producer'
});

const producer = kafka.producer();

export const sendToDLQ = async (originalTopic, message, error) => {
  try {
    await producer.connect();
    
    const dlqMessage = {
      originalTopic,
      originalMessage: message,
      error: error.message,
      timestamp: new Date().toISOString()
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