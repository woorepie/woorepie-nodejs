// src/index.js
import config from './config/env.js';
import mongoose from 'mongoose';
import consumeUserCreated from './consumers/userCreated.js';
import consumeTransactionCreated from './consumers/transactionCreated.js';

async function main() {
    try {
        // MongoDB 연결
        await mongoose.connect(config.MONGODB_URI);
        console.log('MongoDB 연결 성공');

        // 지갑 생성 Consumer 시작 (순서성 불필요)
        console.log('지갑 생성 Consumer 시작...');
        await consumeUserCreated();
        
        // 거래 처리 Consumer 시작 (순서성 필요)
        console.log('거래 처리 Consumer 시작...');
        await consumeTransactionCreated();
        
        // 프로그램이 계속 실행되도록 유지
        process.on('SIGINT', async () => {
            console.log('프로그램을 종료합니다...');
            await mongoose.connection.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('프로그램 실행 중 오류 발생:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// 프로그램 시작
main();
