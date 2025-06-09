import { sendNotification } from './notificationProducer.js';
import { kafka, TOPICS } from '../config/kafka.js';

const producer = kafka.dlqProducer.producer();
let isConnected = false;

// 재시도 설정
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5초

// 재시도하지 않을 에러 타입
const NON_RETRIABLE_ERRORS = [
  'SyntaxError',           // JSON 파싱 에러
  'Invalid JSON format',   // 잘못된 JSON 형식
  'Missing required field' // 필수 필드 누락
];

// DLQ 토픽 매핑 함수
function getDLQTopic(originalTopic) {
  const dlqMapping = {
    [TOPICS.USER_CREATED]: TOPICS.USER_CREATED_DLQ,
    [TOPICS.TRANSACTION_CREATED]: TOPICS.TRANSACTION_CREATED_DLQ,
    [TOPICS.SUBSCRIPTION_CREATED]: TOPICS.SUBSCRIPTION_CREATED_DLQ
  };
  
  return dlqMapping[originalTopic] || `${originalTopic}.dlq`;
}

// DLQ 토픽 초기화 함수
export const initializeDLQTopics = async () => {
  const admin = kafka.dlqProducer.admin();
  try {
    await admin.connect();
    
    const requiredTopics = [
      // DLQ 토픽들
      TOPICS.USER_CREATED_DLQ,
      TOPICS.TRANSACTION_CREATED_DLQ,
      TOPICS.SUBSCRIPTION_CREATED_DLQ,
      // 알림 토픽
      TOPICS.USER_NOTIFICATION
    ];

    // 존재하지 않는 토픽만 생성
    const existingTopics = await admin.listTopics();
    const topicsToCreate = requiredTopics.filter(topic => !existingTopics.includes(topic));

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 3,  // 파티션 수
          replicationFactor: 1  // 복제 팩터
        }))
      });
      console.log('토픽 생성 완료:', topicsToCreate);
    }
  } catch (error) {
    console.error('토픽 초기화 중 오류 발생:', error);
  } finally {
    await admin.disconnect();
  }
};

// producer 연결 관리
async function ensureConnected() {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
    } catch (error) {
      console.error('Failed to connect DLQ producer:', error);
      throw error;
    }
  }
}

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
      await sendErrorNotification(originalTopic, message, error, '복구 불가능한 오류');
      return;
    }

    // 재시도 가능한 에러는 최대 재시도 횟수까지 시도
    if (retryCount < MAX_RETRIES) {
      console.log(`Message sent to DLQ: ${dlqTopic}, Retry count: ${retryCount}`);
      setTimeout(async () => {
        try {
          // DLQ로 다시 전송 (retryCount 증가)
          await sendToDLQ(originalTopic, message, error, retryCount + 1);
        } catch (retryError) {
          console.error('Failed to retry DLQ:', retryError);
        }
      }, RETRY_DELAY);
    } else {
      console.log(`Max retries (${MAX_RETRIES}) exceeded for message in ${originalTopic}`);
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

// 종료 시 producer 연결 해제
process.on('SIGTERM', async () => {
  try {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
    }
  } catch (e) {
    console.error('Error during DLQ producer disconnect:', e);
  }
}); 