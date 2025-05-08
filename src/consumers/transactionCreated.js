import { processTransaction } from '../services/transactionService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';
import { 
  handleKafkaMessage, 
  getConsumerConfig, 
  handleConsumerError,
  validatePayload,
  validateNumber,
  validateEnum
} from '../utils/errorHandler.js';

// 트랜잭션 검증 함수
const validateTransaction = (payload) => {
  validatePayload(payload, ['estate_id', 'trade_id', 'buyer_id', 'seller_id', 'token_price', 'trade_token_amount', 'trade_date'], {
    token_price: (value) => validateNumber(value, 'token_price'),
    trade_token_amount: (value) => validateNumber(value, 'trade_token_amount'),
  });
};

async function consumeTransactionCreated() {
  const consumer = kafka.transactionProcessor.consumer(getConsumerConfig(CONSUMER_GROUPS.TRANSACTION_PROCESSOR));
  console.log('Creating consumer with group:', CONSUMER_GROUPS.TRANSACTION_PROCESSOR);
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.TRANSACTION_CREATED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, async (payload) => {
          // 페이로드 검증
          // validateTransaction(payload);
          
          // 트랜잭션 처리
          console.log(`Processing transaction for user ${payload.user_id}`);
          await processTransaction(payload);
          console.log(`Transaction processed successfully for user ${payload.user_id}`);
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
    handleConsumerError(error, 'transaction', consumeTransactionCreated);
  }
}

export default consumeTransactionCreated; 