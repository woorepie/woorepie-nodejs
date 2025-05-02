// src/consumers/userCreated.js
import { createWallet } from '../services/walletService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';
import { 
  handleKafkaMessage, 
  getConsumerConfig, 
  handleConsumerError,
  validatePayload,
  validateString
} from '../utils/errorHandler.js';

// 사용자 생성 검증 함수
const validateUserCreated = (payload) => {
  validatePayload(payload, ['user_id'], {
    user_id: (value) => validateString(value, 'user_id')
  });
};

async function consumeUserCreated() {
  console.log('Creating consumer with group:', CONSUMER_GROUPS.WALLET_GENERATOR);
  
  const consumer = kafka.userCreated.consumer(getConsumerConfig(CONSUMER_GROUPS.WALLET_GENERATOR));

  try {
    console.log('Attempting to connect to Kafka...');
    await consumer.connect();
    console.log('Successfully connected to Kafka');

    console.log('Subscribing to topic:', TOPICS.USER_CREATED);
    await consumer.subscribe({ topic: TOPICS.USER_CREATED, fromBeginning: false });
    console.log('Successfully subscribed to topic');

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, async (payload) => {
          // 페이로드 검증
          validateUserCreated(payload);
          
          // 지갑 생성
          console.log(`Creating wallet for user ${payload.user_id}`);
          await createWallet(payload.user_id);
          console.log(`Wallet created for user ${payload.user_id}`);
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
    handleConsumerError(error, 'user', consumeUserCreated);
  }
}

export default consumeUserCreated;
