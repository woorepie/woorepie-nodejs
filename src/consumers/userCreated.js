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
  validatePayload(payload, ['customerId'], {
    customerId: (value) => validateString(value, 'customerId')
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
          // payload: { customer_id, customer_kyc, customer_identification_url }
          await createWallet(payload.customer_id, payload.customer_kyc, payload.customer_identification_url);
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
