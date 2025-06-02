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
  validatePayload(payload, ['customerId', 'estateId', 'tradeTokenAmount', 'tokenPrice'], {
    customerId: (value) => validateNumber(value, 'customerId'),
    estateId: (value) => validateNumber(value, 'estateId'),
    tradeTokenAmount: (value) => validateNumber(value, 'tradeTokenAmount'),
    tokenPrice: (value) => validateNumber(value, 'tokenPrice')
  });
};

async function consumeCoinIssue() {
  console.log('청약(코인 발행) Consumer 그룹:', CONSUMER_GROUPS.COIN_ISSUER);
  const consumer = kafka.coinIssuer.consumer(getConsumerConfig(CONSUMER_GROUPS.COIN_ISSUER));

  try {
    console.log('청약(코인 발행) Kafka 연결 시도...');
    await consumer.connect();
    console.log('청약(코인 발행) Kafka 연결 성공');

    console.log('청약(코인 발행) 토픽 구독 시도:', TOPICS.SUBSCRIPTION_CREATED);
    await consumer.subscribe({ topic: TOPICS.SUBSCRIPTION_CREATED, fromBeginning: true });
    console.log('청약(코인 발행) 토픽 구독 성공');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await handleKafkaMessage({ topic, partition, message }, async (payload) => {
          console.log('Received payload:', payload);
          if (Array.isArray(payload.subCustomer)) {
            for (const c of payload.subCustomer) {
              try {
                await issueCoin({
                  customer_id: c.customerId,
                  estate_id: payload.estateId,
                  amount: c.tradeTokenAmount,
                  token_price: payload.tokenPrice,
                  date: new Date(),
                });
                console.log(`청약 완료. 유저 아이디 : ${c.customerId}`);
              } catch (err) {
                console.error(`청약 실패. 유저 아이디 : ${c.customerId}`, err);
                // 필요시 DLQ, 알림 등 추가
              }
            }
          } else {
            // 단일 청약 메시지 처리
            validateCoinIssue(payload);
            await issueCoin({
              customer_id: payload.customerId,
              estate_id: payload.estateId,
              amount: payload.tradeTokenAmount,
              token_price: payload.tokenPrice,
              date: new Date()
            });
            console.log(`청약 완료. 유저 아이디 : ${payload.customerId}`);
          }
        });
      },
    });

    // 종료 시그널 처리
    process.on('SIGTERM', async () => {
      try {
        console.log('Disconnecting coin issue consumer...');
        await consumer.disconnect();
        console.log('Coin issue consumer disconnected');
      } catch (e) {
        console.error('Error during coin issue consumer disconnect:', e);
      }
      process.exit(0);
    });

  } catch (error) {
    handleConsumerError(error, 'coin issue', consumeCoinIssue);
  }
}

export default consumeCoinIssue; 