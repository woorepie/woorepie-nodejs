import { issueCoin } from '../services/coinService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';
import { 
  handleKafkaMessage, 
  getConsumerConfig, 
  handleConsumerError,
  validatePayload,
  validateString,
  validateNumber
} from '../utils/errorHandler.js';

// 코인 발행 검증 함수
const validateCoinIssue = (payload) => {
  validatePayload(payload, ['user_id', 'chain_id', 'amount'], {
    user_id: (value) => validateString(value, 'user_id'),
    // chain_id: (value) => validateString(value, 'chain_id'),
    estate_id: (value) => validateNumber(value, 'estate_id'),
    amount: (value) => validateNumber(value, 'amount'),
    date: (value) => validateDate(value, 'date')
  });
};

async function consumeCoinIssue() {
  const consumer = kafka.coinIssuer.consumer(getConsumerConfig(CONSUMER_GROUPS.COIN_ISSUER));
  console.log('컨슈머 그룹:', CONSUMER_GROUPS.COIN_ISSUER);
  
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.COIN_ISSUE, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, async (payload) => {
          // 페이로드 검증
          validateCoinIssue(payload);
          
          // 코인 발행 처리
          console.log(`유저  ${payload.user_id}에 대해 ${payload.estate_id} 매물 청약 중`);
          await issueCoin(payload);
          console.log(`청약 완료. 유저 아이디 : ${payload.user_id}`);
        });
      },
    });

    // 종료 시그널 처리
    process.on('SIGTERM', async () => {
      try {
        console.log('Disconnecting consumer...');
        await consumer.disconnect();
        console.log('Consumer disconnected');
      } catch (e) {
        console.error('Error during consumer disconnect:', e);
      }
      process.exit(0);
    });

  } catch (error) {
    handleConsumerError(error, 'coin issue', consumeCoinIssue);
  }
}

export default consumeCoinIssue; 