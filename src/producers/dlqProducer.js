import { sendNotification } from './notificationProducer.js';
import { kafka, TOPICS } from '../config/kafka.js';

const producer = kafka.dlqProducer.producer();

// 재시도 설정
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5초

// 재시도하지 않을 에러 타입
const NON_RETRIABLE_ERRORS = [
  'SyntaxError',           // JSON 파싱 에러
  'Invalid JSON format',   // 잘못된 JSON 형식
  'Missing required field' // 필수 필드 누락
];

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
      messages: [{ value: JSON.stringify(dlqMessage) }]
    });

    // 재시도 불가능한 에러인지 확인
    const isNonRetriable = NON_RETRIABLE_ERRORS.some(errorType => 
      error.name === errorType || error.message.includes(errorType)
    );

    if (isNonRetriable) {
      console.log(`Non-retriable error detected: ${error.message}`);
      // 재시도 불가능한 에러는 바로 알림 전송
      await sendErrorNotification(originalTopic, message, error, '복구 불가능한 오류');
      return;
    }

    // 재시도 가능한 에러는 최대 재시도 횟수까지 시도
    if (retryCount < MAX_RETRIES) {
      console.log(`Message sent to DLQ: ${dlqTopic}, Retry count: ${retryCount}`);
      setTimeout(async () => {
        try {
          await producer.send({
            topic: originalTopic,
            messages: [{ value: message }]
          });
          console.log(`Retry attempt ${retryCount + 1} for message in ${originalTopic}`);
        } catch (retryError) {
          await sendToDLQ(originalTopic, message, retryError, retryCount + 1);
        }
      }, RETRY_DELAY);
    } else {
      // 최대 재시도 횟수 초과
      await sendErrorNotification(originalTopic, message, error, '최대 재시도 횟수 초과');
    }
  } catch (err) {
    console.error('Error in DLQ processing:', err);
  } finally {
    await producer.disconnect();
  }
};

// 에러 알림 전송 함수
async function sendErrorNotification(originalTopic, message, error, reason) {
  try {
    let userId = 'unknown';
    try {
      const messageObj = JSON.parse(message);
      userId = messageObj.user_id || 'unknown';
    } catch (e) {
      // JSON 파싱 실패는 무시
    }

    await sendNotification({
      userId,
      type: 'ERROR',
      title: '메시지 처리 실패',
      content: `토픽 ${originalTopic}의 메시지 처리가 실패했습니다. (${reason})`,
      data: {
        originalTopic,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`Error notification sent - ${reason} (userId: ${userId})`);
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }
}

// DLQ 토픽 매핑 함수
function getDLQTopic(originalTopic) {
  const dlqMapping = {
    [TOPICS.USER_CREATED]: `${TOPICS.USER_CREATED}.dlq`,
    [TOPICS.TRANSACTION_CREATED]: `${TOPICS.TRANSACTION_CREATED}.dlq`
  };
  
  return dlqMapping[originalTopic] || `${originalTopic}.dlq`;
} 