import { issueCoin } from '../services/issueService.js';
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
  validatePayload(payload, ['customer_id', 'chain_id', 'amount'], {
    customer_id: (value) => validateString(value, 'customer_id'),
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
    await consumer.subscribe({ topic: TOPICS.SUBSCRIPTION_CREATED, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleKafkaMessage(message, async (payload) => {
          if (Array.isArray(payload.customer)) {
            for (const c of payload.customer) {
              try {
                await issueCoin({
                  customer_id: c.customer_id,
                  estate_id: payload.estate_id,
                  amount: c.trade_token_amount,
                  token_price: c.token_price,
                  date: new Date(),
                });
                console.log(`청약 완료. 유저 아이디 : ${c.customer_id}`);
              } catch (err) {
                console.error(`청약 실패. 유저 아이디 : ${c.customer_id}`, err);
                // 필요시 DLQ, 알림 등 추가
              }
            }
          } else {
            // 단일 청약 메시지 처리
            validateCoinIssue(payload);
            await issueCoin(payload);
            console.log(`청약 완료. 유저 아이디 : ${payload.customer_id}`);
          }
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