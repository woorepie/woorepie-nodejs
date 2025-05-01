import { processTransaction } from '../services/transactionService.js';
import { sendToDLQ } from '../producers/dlqProducer.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';

async function consumeTransactionCreated() {
  const consumer = kafka.transactionProcessor.consumer({ 
    groupId: CONSUMER_GROUPS.TRANSACTION_PROCESSOR
  });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.TRANSACTION_CREATED, fromBeginning: false });

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