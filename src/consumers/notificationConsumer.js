import { Kafka } from 'kafkajs';
import { Notification } from '../models/notification.js';
import { sendSlackNotification } from '../services/slackService.js';

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  clientId: 'notification-consumer'
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

export const startNotificationConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'user.notification', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const notification = JSON.parse(message.value.toString());
        
        // 알림을 데이터베이스에 저장
        await Notification.create({
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          data: notification.data,
          isRead: false,
          createdAt: new Date()
        });

        // Slack으로 알림 전송
        await sendSlackNotification(notification);

        console.log(`Notification processed for user ${notification.userId}`);
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    }
  });
}; 