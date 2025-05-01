// src/consumers/userCreated.js
import { Kafka } from 'kafkajs';
import { createWallet } from '../services/walletService.js';

async function consumeUserCreated() {
  const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER] });
  const consumer = kafka.consumer({ groupId: 'wallet-generator' });

  await consumer.connect();
  await consumer.subscribe({ topic: 'user.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      await createWallet(payload.user_id);
    },
  });
}

export default consumeUserCreated;
