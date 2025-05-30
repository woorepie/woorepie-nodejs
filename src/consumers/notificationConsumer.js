import { Notification } from '../models/notification.js';
import { sendSlackNotification } from '../services/slackService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';
import { handleKafkaMessage } from '../utils/errorHandler.js';

const consumer = kafka.notificationConsumer.consumer({ 
  groupId: CONSUMER_GROUPS.NOTIFICATION,
  heartbeatInterval: 3000,
  sessionTimeout: 10000,
  rebalanceTimeout: 60000,
  maxWaitTimeInMs: 5000
});

// DLQ 메시지 처리 함수
const processDLQMessage = async (payload) => {
  // 알림을 데이터베이스에 저장
  await Notification.create({
    userId: payload.userId || 'unknown',
    type: 'ERROR',
    title: '메시지 처리 실패',
    content: `토픽 ${payload.originalTopic}의 메시지 처리가 실패했습니다.`,
    data: {
      originalTopic: payload.originalTopic,
      error: payload.error,
      timestamp: payload.timestamp,
      stack: payload.stack,
      originalMessage: payload.originalMessage
    },
    isRead: false,
    createdAt: new Date()
  });

  // Slack으로 알림 전송
  await sendSlackNotification({
    userId: payload.userId || 'unknown',
    type: 'ERROR',
    title: '메시지 처리 실패',
    content: `토픽 ${payload.originalTopic}의 메시지 처리가 실패했습니다.`,
    data: {
      originalTopic: payload.originalTopic,
      error: payload.error,
      timestamp: payload.timestamp,
      stack: payload.stack,
      originalMessage: payload.originalMessage
    }
  });

  console.log(`DLQ notification processed for topic ${payload.originalTopic}`);
};

async function startNotificationConsumer() {
  try {
    await consumer.connect();
    
    // DLQ 토픽만 구독
    const dlqTopics = [
      `${TOPICS.USER_CREATED}.dlq`,
      `${TOPICS.TRANSACTION_CREATED}.dlq`
    ];
    
    await consumer.subscribe({ 
      topics: dlqTopics,
      fromBeginning: true 
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, (payload) => {
          console.log('Received payload:', payload);
          return processDLQMessage(payload);
        });
      }
    });

    console.log('DLQ notification consumer started');
  } catch (error) {
    console.error('Error starting DLQ notification consumer:', error);
  }
}

export default startNotificationConsumer; 