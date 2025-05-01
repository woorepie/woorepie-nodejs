// src/consumers/userCreated.js
import { createWallet } from '../services/walletService.js';
import { sendToDLQ } from '../producers/dlqProducer.js';
import { kafka, CONSUMER_GROUPS, TOPICS } from '../config/kafka.js';

async function consumeUserCreated() {
  console.log('Creating consumer with group:', CONSUMER_GROUPS.WALLET_GENERATOR);
  
  const consumer = kafka.userCreated.consumer({ 
    groupId: CONSUMER_GROUPS.WALLET_GENERATOR,
    retry: {
      retries: 10
    }
  });

  try {
    console.log('Attempting to connect to Kafka...');
    await consumer.connect();
    console.log('Successfully connected to Kafka');

    console.log('Subscribing to topic:', TOPICS.USER_CREATED);
    await consumer.subscribe({ topic: TOPICS.USER_CREATED, fromBeginning: false });
    console.log('Successfully subscribed to topic');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          let payload;
          try {
            payload = JSON.parse(message.value.toString());
          } catch (parseError) {
            console.error('Invalid JSON message received:', message.value.toString());
            await sendToDLQ(topic, message.value.toString(), new Error('Invalid JSON format'));
            return; // Skip further processing for this message
          }

          if (!payload.user_id) {
            console.error('Missing user_id in message:', payload);
            await sendToDLQ(topic, message.value.toString(), new Error('Missing user_id in message'));
            return;
          }

          console.log(`Creating wallet for user ${payload.user_id}`);
          
          try {
            await createWallet(payload.user_id);
            console.log(`Wallet created for user ${payload.user_id}`);
          } catch (error) {
            console.error(`Failed to create wallet for user ${payload.user_id}:`, error);
            await sendToDLQ(topic, message.value.toString(), error);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          // Don't throw the error, just log it and continue
        }
      },
    });

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      try {
        await consumer.disconnect();
      } catch (e) {
        console.error('Error during consumer disconnect:', e);
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('Error in consumeUserCreated:', error);
    // Attempt to reconnect
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      consumeUserCreated();
    }, 5000);
  }
}

export default consumeUserCreated;
