// src/index.js
import 'dotenv/config';
import mongoose from 'mongoose';
import consumeUserCreated from './consumers/userCreated.js';

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('MongoDB connected');
  // consumeUserCreated(); // Start Kafka consumer
  
});

async function main() {
    try {
        await consumeUserCreated();
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

main();
