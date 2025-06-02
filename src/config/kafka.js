import { Kafka } from 'kafkajs';
import config from './env.js';

// Kafka 인스턴스 생성 함수
export const createKafkaInstance = (clientId) => {
  return new Kafka({
    brokers: config.KAFKA_BROKER.split(','),
    clientId,
    allowAutoTopicCreation: true  // 토픽 자동 생성 허용
  });
};

// 공통으로 사용할 Kafka 인스턴스들
export const kafka = {
  userCreated: createKafkaInstance('wallet-generator'),
  transactionProcessor: createKafkaInstance('transaction-processor'),
  coinIssuer: createKafkaInstance('coin-issuer'),
  dlqProducer: createKafkaInstance('dlq-producer'),
  notificationProducer: createKafkaInstance('notification-producer'),
  notificationConsumer: createKafkaInstance('notification-consumer')
};

// Consumer 그룹 ID 상수
export const CONSUMER_GROUPS = {
  WALLET_GENERATOR: 'wallet-generator',
  TRANSACTION_PROCESSOR: 'transaction-processor',
  NOTIFICATION: 'notification-group',
  COIN_ISSUER: 'coin-issuer'
};

// 토픽 이름 상수
export const TOPICS = {
  USER_CREATED: 'customer.created',
  TRANSACTION_CREATED: 'transaction.created',
  SUBSCRIPTION_CREATED: 'subscription.accept',
  USER_NOTIFICATION: 'user.notification',
  // DLQ 토픽들
  USER_CREATED_DLQ: 'customer.created.dlq',
  TRANSACTION_CREATED_DLQ: 'transaction.created.dlq',
  SUBSCRIPTION_CREATED_DLQ: 'subscription.accept.dlq'
}; 