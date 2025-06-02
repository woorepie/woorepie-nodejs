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
    'estateId',    // 매물 ID
    'tradeId',     // 거래 ID
    'buyerId',     // 구매자 ID
    'sellerId',    // 판매자 ID
    'tokenPrice',  // 토큰 가격
    'tradeTokenAmount', // 거래 수량
    'tradeDate'    // 거래 일자
  ], {
    tokenPrice: (value) => validateNumber(value, 'tokenPrice'),
    tradeTokenAmount: (value) => validateNumber(value, 'tradeTokenAmount'),
    tradeDate: (value) => validateDate(value, 'tradeDate')
  });
};

async function consumeTransactionCreated() {
  const consumer = kafka.transactionProcessor.consumer(getConsumerConfig(CONSUMER_GROUPS.TRANSACTION_PROCESSOR));
  console.log('트랜잭션 컨슈머 생성:', CONSUMER_GROUPS.TRANSACTION_PROCESSOR);
  
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.TRANSACTION_CREATED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await handleKafkaMessage({ topic, partition, message }, async (payload) => {
          console.log('Received payload:', payload);
          // 페이로드 검증
          // validateTransaction(payload);
          
          // 트랜잭션 처리
          console.log(`트랜잭션 처리 시작: estateId=${payload.estateId}, tradeId=${payload.tradeId}`);
          await processTransaction(payload);
          console.log(`트랜잭션 처리 완료: estateId=${payload.estateId}, tradeId=${payload.tradeId}`);
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