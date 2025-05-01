import { Kafka } from 'kafkajs';
import { sendNotification } from './notificationProducer.js';

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER],
  clientId: 'dlq-producer'
});

const producer = kafka.producer();

// 재시도 설정
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5초

export const sendToDLQ = async (originalTopic, message, error, retryCount = 0) => {
  try {
    await producer.connect();
    
    const dlqMessage = {
      originalTopic,
      originalMessage: message,
      error: error.message,
      timestamp: new Date().toISOString(),
      retryCount
    };

    // 각 토픽별로 다른 DLQ 토픽 사용
    const dlqTopic = getDLQTopic(originalTopic);

    await producer.send({
      topic: dlqTopic,
      messages: [
        {
          value: JSON.stringify(dlqMessage)
        }
      ]
    });

    console.log(`Message sent to DLQ: ${dlqTopic}, Retry count: ${retryCount}`);

    // 재시도 로직
    if (retryCount < MAX_RETRIES) {
      setTimeout(async () => {
        try {
          // 원본 토픽으로 메시지 재전송
          await producer.send({
            topic: originalTopic,
            messages: [
              {
                value: JSON.stringify(message)
              }
            ]
          });
          console.log(`Retry attempt ${retryCount + 1} for message in ${originalTopic}`);
        } catch (retryError) {
          // 재시도 실패 시 재귀적으로 DLQ로 전송
          await sendToDLQ(originalTopic, message, retryError, retryCount + 1);
        }
      }, RETRY_DELAY);
    } else {
      // 최대 재시도 횟수 초과 시 사용자에게 알림
      await sendNotification({
        userId: message.userId,
        type: 'ERROR',
        title: '처리 실패 알림',
        content: `메시지 처리에 실패했습니다. (${originalTopic})`,
        data: {
          originalTopic,
          error: error.message,
          lastAttempt: new Date().toISOString()
        }
      });
      console.log(`Max retries exceeded for message in ${originalTopic}. Notification sent.`);
    }
  } catch (err) {
    console.error('Error in DLQ processing:', err);
  } finally {
    await producer.disconnect();
  }
};

// DLQ 토픽 매핑 함수
function getDLQTopic(originalTopic) {
  const dlqMapping = {
    'user.created': 'user.created.dlq',
    'transaction.created': 'transaction.created.dlq'
  };
  
  return dlqMapping[originalTopic] || `${originalTopic}.dlq`;
} 