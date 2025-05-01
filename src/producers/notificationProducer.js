import { kafka, TOPICS } from '../config/kafka.js';

const producer = kafka.notificationProducer.producer();

export const sendNotification = async (notification) => {
  try {
    await producer.connect();

    await producer.send({
      topic: TOPICS.USER_NOTIFICATION,
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