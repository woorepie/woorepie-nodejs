import { Kafka } from 'kafkajs';
import { processTransaction } from '../services/transactionService.js';
import { sendToDLQ } from '../producers/dlqProducer.js';

async function consumeTransactionCreated() {
  const kafka = new Kafka({ 
    brokers: [process.env.KAFKA_BROKER],
    clientId: 'transaction-processor'
  });
  
  const consumer = kafka.consumer({ 
    groupId: 'transaction-processor'
  });

  await consumer.connect();
  await consumer.subscribe({ topic: 'transaction.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      console.log(`Processing transaction for user ${payload.user_id}`);
      
      try {
        await processTransaction(payload);
        console.log(`Transaction processed successfully for user ${payload.user_id}`);
      } catch (error) {
        console.error(`Error processing transaction for user ${payload.user_id}:`, error);
        await sendToDLQ('transaction.created', message.value.toString(), error);
      }
    },
  });
}

export default consumeTransactionCreated; 