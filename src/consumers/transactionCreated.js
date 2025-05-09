import { processTransaction } from '../services/transactionService.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';
import { 
  handleKafkaMessage, 
  getConsumerConfig, 
  handleConsumerError,
  validatePayload,
  validateNumber,
  validateDate
} from '../utils/errorHandler.js';

// 트랜잭션 검증 함수
const validateTransaction = (payload) => {
  validatePayload(payload, [
    'estate_id',    // 매물 ID
    'trade_id',     // 거래 ID
    'buyer_id',     // 구매자 ID
    'seller_id',    // 판매자 ID
    'token_price',  // 토큰 가격
    'trade_token_amount', // 거래 수량
    'trade_date'    // 거래 일자
  ], {
    token_price: (value) => validateNumber(value, 'token_price'),
    trade_token_amount: (value) => validateNumber(value, 'trade_token_amount'),
    trade_date: (value) => validateDate(value, 'trade_date')
  });
};

async function consumeTransactionCreated() {
  const consumer = kafka.transactionProcessor.consumer(getConsumerConfig(CONSUMER_GROUPS.TRANSACTION_PROCESSOR));
  console.log('트랜잭션 컨슈머 생성:', CONSUMER_GROUPS.TRANSACTION_PROCESSOR);
  
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.TRANSACTION_CREATED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, async (payload) => {
          // 페이로드 검증
          // validateTransaction(payload);
          
          // 트랜잭션 처리
          console.log(`트랜잭션 처리 시작: estate_id=${payload.estate_id}, trade_id=${payload.trade_id}`);
          await processTransaction(payload);
          console.log(`트랜잭션 처리 완료: estate_id=${payload.estate_id}, trade_id=${payload.trade_id}`);
        });
      },
    });

    // 종료 시그널 처리
    process.on('SIGTERM', async () => {
      try {
        console.log('컨슈머 연결 해제 중...');
        await consumer.disconnect();
        console.log('컨슈머 연결 해제 완료');
      } catch (e) {
        console.error('컨슈머 연결 해제 중 오류 발생:', e);
      }
      process.exit(0);
    });

  } catch (error) {
    handleConsumerError(error, 'transaction', consumeTransactionCreated);
  }
}

export default consumeTransactionCreated; 