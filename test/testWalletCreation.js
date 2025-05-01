const mongoose = require('mongoose');
const walletService = require('../src/services/walletService');
const connectDB = require('../src/config/database');
const readline = require('readline');

// readline 인터페이스 생성
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createWalletForUser(userId) {
    try {
        console.log(`사용자 ${userId}를 위한 지갑 생성 중...`);
        await walletService.createWallet(userId);
        console.log('지갑 생성이 완료되었습니다!');
    } catch (error) {
        console.error('지갑 생성 중 오류 발생:', error);
    }
}

async function main() {
    try {
        // MongoDB 연결
        await connectDB();
        console.log('MongoDB 연결 성공');

        // 사용자 입력을 받는 함수
        const askForUserId = () => {
            rl.question('지갑을 생성할 사용자 ID를 입력하세요 (종료하려면 "exit" 입력): ', async (userId) => {
                if (userId.toLowerCase() === 'exit') {
                    console.log('프로그램을 종료합니다...');
                    await mongoose.connection.close();
                    rl.close();
                    process.exit(0);
                } else {
                    await createWalletForUser(userId);
                    // 다음 입력을 기다림
                    askForUserId();
                }
            });
        };

        // 첫 번째 입력 요청
        askForUserId();

    } catch (error) {
        console.error('프로그램 실행 중 오류 발생:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// 프로그램 시작
main();