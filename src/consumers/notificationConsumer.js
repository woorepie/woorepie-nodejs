import { Notification } from '../models/notification.js';
import { sendSlackNotification } from '../services/slackService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';

const consumer = kafka.notificationConsumer.consumer({ 
  groupId: CONSUMER_GROUPS.NOTIFICATION,
  // 추가 설정
  heartbeatInterval: 3000,
  sessionTimeout: 10000,
  rebalanceTimeout: 60000,
  maxWaitTimeInMs: 5000
});

export const startNotificationConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ 
      topic: TOPICS.USER_NOTIFICATION, 
      fromBeginning: true 
    });

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

    console.log('Notification consumer started');
  } catch (error) {
    console.error('Error starting notification consumer:', error);
  }
}; 