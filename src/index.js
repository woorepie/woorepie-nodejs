// src/index.js
import config from './config/env.js';
import http from 'http';
import mongoose from 'mongoose';
import consumeUserCreated from './consumers/userCreated.js';
import consumeTransactionCreated from './consumers/transactionCreated.js';
import consumeCoinIssue from './consumers/coinIssue.js';


/** 헬스체크용 HTTP 서버 */
function startHealthServer() {
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })
  
    server.listen(5000, () => {
      console.log('▶ Health check server listening on port 5000')
    })
  }
  
async function main() {
    try {
        // MongoDB 연결
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB 연결 성공');

        startHealthServer();

        // 지갑 생성 Consumer 시작 (순서성 불필요)
        console.log('지갑 생성 Consumer 시작...');
        await consumeUserCreated();
        
        // 거래 처리 Consumer 시작 (순서성 필요)
        console.log('거래 처리 Consumer 시작...');
        await consumeTransactionCreated();
        
        // 청약(코인 발행) Consumer 시작
        console.log('청약(코인 발행) Consumer 시작...');
        await consumeCoinIssue();
        
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
