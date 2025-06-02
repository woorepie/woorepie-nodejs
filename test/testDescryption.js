import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import readline from 'readline';
import { decryptKey } from '../src/utils/crypto.js';
import WalletModel from '../src/models/wallet.js';

// readline 인터페이스 생성
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function decryption(privateKey) {
    try {
        if (!privateKey) {
            throw new Error('암호화된 키가 없습니다.');
        }

        const decryptedKey = decryptKey(privateKey);
        console.log(`복호화된 키: ${decryptedKey}`);
        return decryptedKey;
    } catch (error) {
        console.error('복호화 중 오류 발생:', error.message);
        throw error;
    }
}

async function main() {
    try {
        // MongoDB 연결
        await connectDB();
        console.log('MongoDB 연결 성공');

        // 사용자 입력을 받는 함수
        const askForUserId = () => {
            rl.question('사용자 ID를 입력하세요: ', async (userId) => {
                try {
                    if (userId.toLowerCase() === 'exit') {
                        console.log('프로그램을 종료합니다...');
                        await mongoose.connection.close();
                        rl.close();
                        process.exit(0);
                    }

                    console.log('검색할 customer_id:', userId);
                    console.log('현재 연결된 데이터베이스:', mongoose.connection.db.databaseName);
                    
                    // 컬렉션 존재 여부 확인
                    const collections = await mongoose.connection.db.listCollections().toArray();
                    console.log('사용 가능한 컬렉션:', collections.map(c => c.name));

                    // 쿼리 실행 전 로그
                    // console.log('WalletModel 쿼리 실행...');
                    const wallet = await WalletModel.findOne({ customer_id: userId });
                    console.log('쿼리 결과:', wallet);

                    if (!wallet) {
                        console.error('해당 사용자의 지갑을 찾을 수 없습니다.');
                        askForUserId();
                        return;
                    }

                    console.log(`사용자 ${wallet.wallet_address} 지갑 복호화 시도...`);
                    await decryption(wallet.encrypted_key);
                    
                    // 다음 입력을 기다림
                    askForUserId();
                } catch (error) {
                    console.error('처리 중 오류 발생:', error);
                    console.error('에러 스택:', error.stack);
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