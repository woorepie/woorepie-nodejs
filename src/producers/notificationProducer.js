import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  clientId: 'notification-producer'
});

const producer = kafka.producer();

export const sendNotification = async (notification) => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'user.notification',
      messages: [
        {
          value: JSON.stringify(notification)
        }
      ]
    });

    console.log(`Notification sent to user ${notification.userId}`);
  } catch (err) {
    console.error('Error sending notification:', err);
  } finally {
    await producer.disconnect();
  }
}; 