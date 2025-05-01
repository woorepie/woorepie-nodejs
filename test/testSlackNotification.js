import { sendSlackNotification } from '../src/services/slackService.js';
import config from '../src/config/env.js';

const testNotification = {
  userId: 'test-user-123',
  type: 'ERROR',
  title: '테스트 알림',
  content: '이것은 테스트 알림입니다.',
  data: {
    originalTopic: 'transaction.created',
    error: '테스트 오류: 거래 처리 실패',
    timestamp: new Date().toISOString(),
    stack: 'Error: 테스트 오류\n    at testFunction (test.js:10)\n    at main (test.js:20)',
    originalMessage: {
      amount: 1000,
      from: 'wallet-1',
      to: 'wallet-2',
      currency: 'KRW'
    }
  }
};

// 테스트 실행
console.log('테스트 알림 전송 중...');
sendSlackNotification(testNotification)
  .then(() => console.log('테스트 알림 전송 완료'))
  .catch(error => console.error('테스트 알림 전송 실패:', error)); 