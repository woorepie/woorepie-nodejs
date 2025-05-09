import { sendToDLQ } from '../producers/dlqProducer.js';
import { sendNotification } from '../producers/notificationProducer.js';

// 공통 검증 함수
export const validatePayload = (payload, requiredFields, validations = {}) => {
  // 필수 필드 검증
  const missingFields = requiredFields.filter(field => !payload[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // 추가 검증 로직
  for (const [field, validation] of Object.entries(validations)) {
    if (payload[field] !== undefined) {
      validation(payload[field], field);
    }
  }
};

// 숫자 검증
export const validateNumber = (value, field) => {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`Invalid ${field}: must be a positive number`);
  }
};

// 문자열 검증
export const validateString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${field}: must be a non-empty string`);
  }
};

// 열거형 검증
export const validateEnum = (value, field, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${field}: must be one of ${allowedValues.join(', ')}`);
  }
};

// 날짜 검증
export const validateDate = (value, fieldName) => {
  if (!value) {
    throw new Error(`${fieldName}는 필수 값입니다.`);
  }

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else {
    throw new Error(`${fieldName}는 유효한 날짜 형식이어야 합니다.`);
  }

  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName}는 유효한 날짜 형식이어야 합니다.`);
  }

  return date;
};

// 에러 알림 전송 함수
const sendErrorNotification = async (topic, message, error, userId = 'unknown') => {
  try {
    await sendNotification({
      userId,
      type: 'ERROR',
      title: '메시지 처리 실패',
      content: `토픽 ${topic}의 메시지 처리가 실패했습니다.`,
      data: {
        originalTopic: topic,
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack,
        originalMessage: message
      }
    });
    console.log(`Error notification sent for user ${userId}`);
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }
};

// Kafka 메시지 처리 래퍼
export const handleKafkaMessage = async (message, handler) => {
  let payload;
  const { topic, partition } = message;
  
  try {
    // 1. JSON 파싱
    try {
      payload = JSON.parse(message.value.toString());
    } catch (parseError) {
      console.error('Invalid JSON message received:', message.value.toString());
      await sendToDLQ(topic, message.value.toString(), new Error('Invalid JSON format'));
      await sendErrorNotification(topic, message.value.toString(), new Error('Invalid JSON format'));
      return;
    }

    // 2. 메시지 처리
    await handler(payload);
    
  } catch (error) {
    console.error('Error processing message:', {
      error: error.message,
      payload: payload || 'Invalid JSON',
      topic,
      partition
    });
    
    // DLQ로 전송
    await sendToDLQ(topic, message.value.toString(), error);
    
    // 에러 알림 전송
    const userId = payload?.user_id || 'unknown';
    await sendErrorNotification(topic, message.value.toString(), error, userId);
  }
};

// 컨슈머 설정
export const getConsumerConfig = (groupId) => ({
  groupId,
  heartbeatInterval: 3000,
  sessionTimeout: 10000,
  maxWaitTimeInMs: 5000
});

// 컨슈머 재연결 로직
export const handleConsumerError = (error, consumerName, reconnectFn) => {
  console.error(`Fatal error in ${consumerName} consumer:`, error);
  setTimeout(() => {
    console.log(`Attempting to reconnect ${consumerName} consumer...`);
    reconnectFn();
  }, 5000);
}; 