// src/consumers/userCreated.js
import { Kafka } from 'kafkajs';
import { createWallet } from '../services/walletService.js';
import { sendToDLQ } from '../producers/dlqProducer.js';

async function consumeUserCreated() {
  const kafka = new Kafka({ 
    brokers: [process.env.KAFKA_BROKER],
    clientId: 'wallet-generator'
  });
  
  const consumer = kafka.consumer({ 
    groupId: 'wallet-generator'
  });

  await consumer.connect();
  await consumer.subscribe({ topic: 'user.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      console.log(`Creating wallet for user ${payload.user_id}`);
      
      try {
        await createWallet(payload.user_id);
      } catch (error) {
        console.error(`Failed to create wallet for user ${payload.user_id}:`, error);
        await sendToDLQ('user.created', message.value.toString(), error);
      }
    },
  });
}

export default consumeUserCreated;
